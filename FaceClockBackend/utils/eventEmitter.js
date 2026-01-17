/**
 * 🔔 CENTRAL EVENT EMITTER
 * 
 * Handles all system actions and broadcasts them to:
 * - Mobile App (Real-time via Socket.IO)
 * - Desktop App (Real-time via Socket.IO)
 * - Admin Dashboard
 * - Host Company Dashboard
 * 
 * Events tracked:
 * - Clock In/Out
 * - Staff Registration/Removal
 * - Leave Requests
 * - Attendance Corrections
 * - Payroll Actions
 * - System Alerts
 */

const EventEmitter = require('events').EventEmitter;
const notificationRules = require('./notificationRules');

class SystemEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
    this.socketIOInstances = {};
    this.activeConnections = new Map();
  }

  /**
   * Register Socket.IO instance for real-time delivery
   */
  registerSocketIO(io) {
    this.socketIOInstances.io = io;
    console.log('✅ Socket.IO registered for real-time notifications');
    
    // Track active connections
    io.on('connection', (socket) => {
      const userId = socket.handshake.auth.userId;
      const userType = socket.handshake.auth.userType; // 'admin', 'host', 'intern', 'staff'
      
      if (userId) {
        const connectionKey = `${userType}:${userId}`;
        this.activeConnections.set(connectionKey, socket);
        
        console.log(`✅ User connected: ${connectionKey}`);
        
        socket.on('disconnect', () => {
          this.activeConnections.delete(connectionKey);
          console.log(`❌ User disconnected: ${connectionKey}`);
        });
      }
    });
  }

  /**
   * Emit a system event
   */
  emitAction(actionType, payload) {
    const timestamp = new Date();
    const eventData = {
      actionType,
      timestamp,
      payload,
      id: `${actionType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Log the action
    console.log(`📢 ACTION: ${actionType}`, JSON.stringify(payload, null, 2));

    // Emit internal event for listeners
    this.emit(actionType, eventData);

    return eventData;
  }

  /**
   * Send real-time notification to specific user
   */
  sendToUser(userId, userType, notification, eventName = 'notification') {
    const connectionKey = `${userType}:${userId}`;
    const socket = this.activeConnections.get(connectionKey);

    if (socket) {
      socket.emit(eventName, notification);
      console.log(`📤 Emitted '${eventName}' to ${connectionKey}`);
    } else {
      console.log(`⚠️ User not connected: ${connectionKey} (will be fetched on next login)`);
    }
  }

  /**
   * Send real-time notification to multiple users
   */
  sendToUsers(userIds, userType, notification) {
    userIds.forEach(userId => {
      this.sendToUser(userId, userType, notification);
    });
  }

  /**
   * Broadcast notification to all users of a type
   */
  broadcastToType(userType, notification) {
    for (const [connKey, socket] of this.activeConnections) {
      if (connKey.startsWith(userType)) {
        socket.emit('notification', notification);
      }
    }
    console.log(`📡 Broadcast sent to ${userType}`);
  }

  /**
   * Broadcast to host company
   */
  broadcastToHostCompany(hostCompanyId, notification) {
    for (const [connKey, socket] of this.activeConnections) {
      if (connKey.includes(`host:${hostCompanyId}`)) {
        socket.emit('notification', notification);
      }
    }
  }

  /**
   * Broadcast to department
   */
  broadcastToDepartment(departmentId, notification) {
    for (const [connKey, socket] of this.activeConnections) {
      // This requires tracking department in connections (can be enhanced)
      socket.emit('notification', notification);
    }
  }

  /**
   * Get active connections count by type
   */
  getActiveConnections(userType = null) {
    if (!userType) {
      return this.activeConnections.size;
    }
    
    let count = 0;
    for (const connKey of this.activeConnections.keys()) {
      if (connKey.startsWith(userType)) count++;
    }
    return count;
  }

  /**
   * Send notification to a specific intern
   */
  sendToIntern(internId, notification) {
    this.sendToUser(internId, 'Intern', notification, 'notification');
  }

  /**
   * Send notification to a specific host company
   */
  sendToHostCompany(hostCompanyId, notification) {
    this.sendToUser(hostCompanyId, 'HostCompany', notification, 'notification');
  }

  /**
   * Send notification to multiple interns
   */
  sendToInterns(internIds, notification) {
    this.sendToUsers(internIds, 'Intern', notification);
  }

  /**
   * Send notification to multiple host companies
   */
  sendToHostCompanies(companyIds, notification) {
    this.sendToUsers(companyIds, 'HostCompany', notification);
  }

  /**
   * Broadcast to all interns (system-wide)
   */
  broadcastToAllInterns(notification) {
    this.broadcastToType('Intern', notification);
  }

  /**
   * Broadcast to all host companies (system-wide)
   */
  broadcastToAllHostCompanies(notification) {
    this.broadcastToType('HostCompany', notification);
  }
}

// Export singleton instance
module.exports = new SystemEventEmitter();
