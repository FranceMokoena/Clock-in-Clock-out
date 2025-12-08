const { RekognitionClient, ListCollectionsCommand } = require('@aws-sdk/client-rekognition');

(async () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const client = new RekognitionClient({ region });
  try {
    const res = await client.send(new ListCollectionsCommand({}));
    console.log('OK collections:', res.CollectionIds || []);
  } catch (e) {
    console.error('FAILED:', e.name, e.message);
  }
})();