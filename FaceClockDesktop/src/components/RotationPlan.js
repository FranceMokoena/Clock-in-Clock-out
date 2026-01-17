import React, { useState } from 'react';
import {
  MdArrowForward,
  MdCheckCircle,
  MdPeople,
  MdSchool,
  MdThumbUp,
  MdVerified,
  MdHelpOutline,
} from 'react-icons/md';
import './RotationPlan.css';

function RotationPlan({ isAdmin, hostCompanyId, isHostCompany }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rotation-plan-container">
      {/* Hero Section */}
      <section className="rotation-plan-hero">
        <div className="hero-content">
          <div className="hero-icon">
            <MdSchool />
          </div>
          <h1>Intern Rotation Plan</h1>
          <p className="hero-subtitle">
            Strategic Career Development Through Multi-Department Experience
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="rotation-plan-content">
        {/* Overview Card */}
        <section className="overview-section">
          <div className="section-header">
            <h2>What is the Rotation Plan?</h2>
            <p className="section-description">
              The Intern Rotation Plan is a comprehensive framework designed to enhance the professional 
              development of interns by exposing them to diverse departments and roles within your organization.
            </p>
          </div>

          <div className="overview-cards">
            <div className="overview-card primary">
              <div className="card-icon">
                <MdPeople />
              </div>
              <h3>Multi-Department Assignment</h3>
              <p>
                Interns are systematically assigned to different departments within the organization, 
                gaining exposure to various business functions and operational areas.
              </p>
            </div>

            <div className="overview-card primary">
              <div className="card-icon">
                <MdThumbUp />
              </div>
              <h3>Performance-Based Progression</h3>
              <p>
                Interns who demonstrate strong performance, positive behavior, and competency in their 
                current department are approved to rotate to new departments.
              </p>
            </div>

            <div className="overview-card primary">
              <div className="card-icon">
                <MdVerified />
              </div>
              <h3>Approval-Driven Process</h3>
              <p>
                Department supervisors and administrators review intern performance and provide formal 
                approval before progression to the next rotation.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <div className="section-header">
            <h2>How the Rotation Plan Works</h2>
            <p className="section-description">
              A structured process ensures interns develop comprehensive skills while meeting organizational needs.
            </p>
          </div>

          <div className="process-timeline">
            <div className="timeline-item">
              <div className="timeline-number">1</div>
              <div className="timeline-content">
                <h3>Initial Assignment</h3>
                <p>
                  An intern is assigned to their first department based on their background, skills, 
                  and organizational requirements. They complete onboarding and begin their internship.
                </p>
              </div>
            </div>

            <div className="timeline-arrow">
              <MdArrowForward />
            </div>

            <div className="timeline-item">
              <div className="timeline-number">2</div>
              <div className="timeline-content">
                <h3>Performance Monitoring</h3>
                <p>
                  Throughout their tenure in the department, supervisors continuously assess the intern's 
                  performance, behavior, punctuality, reliability, and learning progress.
                </p>
              </div>
            </div>

            <div className="timeline-arrow">
              <MdArrowForward />
            </div>

            <div className="timeline-item">
              <div className="timeline-number">3</div>
              <div className="timeline-content">
                <h3>Evaluation & Approval</h3>
                <p>
                  The supervisor and admin team review the intern's performance records. If performance 
                  is satisfactory, approval is granted for departmental rotation.
                </p>
              </div>
            </div>

            <div className="timeline-arrow">
              <MdArrowForward />
            </div>

            <div className="timeline-item">
              <div className="timeline-number">4</div>
              <div className="timeline-content">
                <h3>Next Department Rotation</h3>
                <p>
                  The approved intern is rotated to their next assigned department. They bring knowledge 
                  and experience from the previous rotation, fostering cross-functional understanding.
                </p>
              </div>
            </div>

            <div className="timeline-arrow">
              <MdArrowForward />
            </div>

            <div className="timeline-item">
              <div className="timeline-number">5</div>
              <div className="timeline-content">
                <h3>Continuous Cycle</h3>
                <p>
                  The process repeats for each rotation. Interns continue to develop expertise across 
                  multiple departments until they complete all assigned rotations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="benefits-section">
          <div className="section-header">
            <h2>Benefits of the Rotation Plan</h2>
            <p className="section-description">
              Both interns and the organization benefit significantly from this structured approach.
            </p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <MdCheckCircle />
              </div>
              <h3>For Interns</h3>
              <ul className="benefits-list">
                <li>Gain exposure to multiple departments and business functions</li>
                <li>Develop diverse skill sets across the organization</li>
                <li>Build professional networks within different teams</li>
                <li>Enhance resume with multi-faceted experience</li>
                <li>Identify areas of professional interest and strength</li>
                <li>Prepare for future career opportunities</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <MdCheckCircle />
              </div>
              <h3>For Organization</h3>
              <ul className="benefits-list">
                <li>Identify and nurture top talent across departments</li>
                <li>Foster cross-functional collaboration and knowledge sharing</li>
                <li>Fill temporary staffing needs in multiple areas</li>
                <li>Develop future employees with broad organizational knowledge</li>
                <li>Improve operational efficiency with fresh perspectives</li>
                <li>Reduce high-potential candidate turnover</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Approval Requirements Section */}
        <section className="approval-section">
          <div className="section-header">
            <h2>Approval Requirements & Criteria</h2>
            <p className="section-description">
              Rotation approvals are based on comprehensive performance evaluation criteria.
            </p>
          </div>

          <div className="approval-criteria">
            <div className="criteria-box">
              <h3>Supervisor Responsibilities</h3>
              <ul>
                <li>Assess intern performance and conduct</li>
                <li>Review attendance and punctuality records</li>
                <li>Evaluate technical and soft skills development</li>
                <li>Provide performance feedback and recommendations</li>
                <li>Recommend approval or continuation in current department</li>
              </ul>
            </div>

            <div className="criteria-box">
              <h3>Admin Review & Approval</h3>
              <ul>
                <li>Review supervisor recommendations and performance data</li>
                <li>Analyze attendance and behavioral compliance records</li>
                <li>Verify performance metrics and quality indicators</li>
                <li>Determine readiness for next rotation</li>
                <li>Issue formal approval or continuation notice</li>
              </ul>
            </div>

            <div className="criteria-box">
              <h3>Performance Metrics Considered</h3>
              <ul>
                <li>Attendance rate and punctuality</li>
                <li>Quality of work and task completion</li>
                <li>Professional behavior and teamwork</li>
                <li>Learning progress and skill development</li>
                <li>Initiative and willingness to contribute</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="features-section">
          <div className="section-header">
            <h2>Key Features of This Platform</h2>
            <p className="section-description">
              This system provides comprehensive tools to manage the rotation process effectively.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-number">📊</div>
              <h3>Performance Tracking</h3>
              <p>
                Monitor attendance, behavioral scores, and productivity metrics for each intern 
                across different departments.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-number">✅</div>
              <h3>Structured Approvals</h3>
              <p>
                Formal approval workflow ensuring supervisors and administrators evaluate each 
                intern before department rotation.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-number">📋</div>
              <h3>Rotation Records</h3>
              <p>
                Complete history of each intern's rotations, departments, durations, and performance 
                evaluations for audit and reference.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-number">👥</div>
              <h3>Department Management</h3>
              <p>
                Organize interns by assigned departments with rotation schedules and expected completion 
                timelines.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-number">📈</div>
              <h3>Progress Analytics</h3>
              <p>
                View comprehensive reports on intern rotation progress, completion rates, and 
                performance across departments.
              </p>
            </div>

            <div className="feature-item">
              <div className="feature-number">🔔</div>
              <h3>Notifications & Alerts</h3>
              <p>
                Receive notifications when rotations are due, approvals are pending, or performance 
                issues require attention.
              </p>
            </div>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className="getting-started-section">
          <div className="section-header">
            <h2>Getting Started with Rotation Plans</h2>
            <p className="section-description">
              Follow these steps to begin managing intern rotations in your organization.
            </p>
          </div>

          <div className="getting-started-steps">
            <div className="step-box">
              <div className="step-number">1</div>
              <h3>Configure Departments</h3>
              <p>Ensure all departments in your organization are configured in the system.</p>
            </div>

            <div className="step-box">
              <div className="step-number">2</div>
              <h3>Register Interns</h3>
              <p>Add interns to the system with their initial department assignments.</p>
            </div>

            <div className="step-box">
              <div className="step-number">3</div>
              <h3>Define Rotation Paths</h3>
              <p>Specify which departments each intern should rotate through during their tenure.</p>
            </div>

            <div className="step-box">
              <div className="step-number">4</div>
              <h3>Monitor Performance</h3>
              <p>Track attendance, behavior, and performance metrics throughout each rotation.</p>
            </div>

            <div className="step-box">
              <div className="step-number">5</div>
              <h3>Review & Approve Rotations</h3>
              <p>Conduct performance reviews and approve department rotations based on criteria.</p>
            </div>

            <div className="step-box">
              <div className="step-number">6</div>
              <h3>Generate Reports</h3>
              <p>Use the Reports section to analyze rotation completion and performance trends.</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <div className="section-header">
            <h2>Frequently Asked Questions</h2>
            <p className="section-description">
              Common questions about the Rotation Plan system.
            </p>
          </div>

          <div className="faq-container">
            <div className="faq-item">
              <h3>
                <MdHelpOutline className="faq-icon" />
                How long does an intern stay in each department?
              </h3>
              <p>
                The duration depends on the organization's rotation plan. Typically, interns spend 
                3-6 months per department, but this can be customized based on departmental needs 
                and learning objectives.
              </p>
            </div>

            <div className="faq-item">
              <h3>
                <MdHelpOutline className="faq-icon" />
                What happens if an intern doesn't perform well in a department?
              </h3>
              <p>
                If performance is below expectations, the intern may be given additional time in 
                the current department to improve, or alternative arrangements may be made. However, 
                they won't progress to the next rotation until performance standards are met.
              </p>
            </div>

            <div className="faq-item">
              <h3>
                <MdHelpOutline className="faq-icon" />
                Can interns extend their stay in a particular department?
              </h3>
              <p>
                Yes. If an intern is performing exceptionally well or if the department requires 
                extended support, the rotation schedule can be adjusted with supervisor and admin approval.
              </p>
            </div>

            <div className="faq-item">
              <h3>
                <MdHelpOutline className="faq-icon" />
                How are rotation schedules communicated to interns?
              </h3>
              <p>
                Rotation schedules are communicated through the portal notifications system, and 
                interns can view their rotation plan in the Staff & Interns section of the dashboard.
              </p>
            </div>

            <div className="faq-item">
              <h3>
                <MdHelpOutline className="faq-icon" />
                What performance metrics are most important for rotation approval?
              </h3>
              <p>
                Key metrics include: attendance rate, punctuality, quality of work, professional 
                behavior, teamwork, and demonstrated learning. All contribute to the overall 
                evaluation for rotation approval.
              </p>
            </div>

            <div className="faq-item">
              <h3>
                <MdHelpOutline className="faq-icon" />
                Can an intern be removed from the rotation program?
              </h3>
              <p>
                Yes. If an intern consistently fails to meet performance standards or violates 
                organizational policies, they may be removed from the rotation program pending 
                administrative review.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Manage Intern Rotations?</h2>
            <p>
              Use the Staff & Interns section to view interns, monitor their progress, and 
              manage their rotations across departments. Access performance reports and approvals 
              from the Reports section.
            </p>
            <div className="cta-buttons">
              <button className="cta-button primary" onClick={() => window.history.back()}>
                ← Back to Dashboard
              </button>
              <button className="cta-button secondary" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide Details' : 'Show More Details'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RotationPlan;
