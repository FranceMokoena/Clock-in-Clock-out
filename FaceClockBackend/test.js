node -'NODE'
require('dotenv').config();
const mongoose = require('mongoose');
const HostCompany = require('./models/HostCompany');
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const docs = await HostCompany.find().lean();
    console.log('Host companies count:', docs.length);
  } catch (e) {
    console.error('HostCompany query error:', e);
  } finally {
    await mongoose.disconnect();
  }
})();
NODE