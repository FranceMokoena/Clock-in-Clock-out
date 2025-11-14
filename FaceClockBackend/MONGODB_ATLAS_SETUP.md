# MongoDB Atlas Setup Guide for Render.com

## Issue: IP Whitelist Error

If you're seeing this error:
```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster. 
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

## Solution: Whitelist IP Addresses in MongoDB Atlas

### Step 1: Access MongoDB Atlas
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Log in to your account
3. Select your project (Project 0)

### Step 2: Navigate to Network Access
1. In the left sidebar, click **"Network Access"** (under Security)
2. Click **"IP Access List"** tab

### Step 3: Add IP Address
For **Render.com deployment**, you have two options:

#### Option A: Allow All IPs (Easiest - for development/testing)
1. Click **"Add IP Address"** button
2. Click **"Allow Access from Anywhere"** button
3. This will add `0.0.0.0/0` which allows all IP addresses
4. Click **"Confirm"**
5. ⚠️ **Note**: This is less secure but works for development. For production, use Option B.

#### Option B: Add Specific IPs (More Secure - for production)
1. Click **"Add IP Address"** button
2. Enter the IP address or CIDR block
3. Add a comment like "Render.com Service"
4. Click **"Confirm"**

**Note**: Render.com uses dynamic IPs, so you may need to check Render's documentation for their IP ranges or use Option A for simplicity.

### Step 4: Wait for Propagation
- Changes typically take **1-2 minutes** to propagate
- You'll see a status indicator next to the IP entry

### Step 5: Verify Connection
1. Restart your Render service
2. Check the logs to see if MongoDB connects successfully
3. You should see: `✅ MongoDB connected successfully`

## Additional Checks

### Verify Database User Permissions
1. Go to **"Database Access"** in MongoDB Atlas
2. Ensure your database user has:
   - **Read and write to any database** (for development)
   - OR specific database permissions for "Employees" database

### Verify Connection String
Make sure your `.env` file has the correct connection string:
```
MONGO_URI=mongodb+srv://username:password@my1st-cluster.y7nyqx5.mongodb.net/Employees?retryWrites=true&w=majority
```

Replace:
- `username` with your MongoDB Atlas username
- `password` with your MongoDB Atlas password
- `Employees` is your database name

## Testing Connection

After whitelisting, test the connection:
1. Your Render service should automatically reconnect
2. Check logs for: `✅ MongoDB connected successfully`
3. Try making an API request to verify it works

## Troubleshooting

### Still can't connect?
1. **Double-check IP whitelist**: Make sure `0.0.0.0/0` is added
2. **Check connection string**: Verify username, password, and cluster name
3. **Check database user**: Ensure user exists and has correct permissions
4. **Wait longer**: Sometimes it takes 3-5 minutes for changes to propagate
5. **Check Render logs**: Look for specific error messages

### Security Best Practices
- For production, consider using MongoDB Atlas VPC peering with Render
- Use specific IP ranges instead of `0.0.0.0/0` when possible
- Regularly review and update your IP whitelist
- Use strong passwords for database users

