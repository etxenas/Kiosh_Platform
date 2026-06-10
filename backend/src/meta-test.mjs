import 'dotenv/config';
import { SalesforceClient } from './salesforce-client.js';
import fs from 'fs';
import path from 'path';

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
});

const pkg = {
  package: {
    types: [{ name: 'CustomObject', members: ['Hyrto_Hub__c','Hyrto_Booking__c','Hyrto_Addon__c','Hyrto_ServiceLog__c'] }],
    version: '62.0',
  },
};

const dir = '/tmp/sf_meta_' + Date.now();
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'package.xml'), JSON.stringify(pkg, null, 2));

console.log('Created package.xml at', dir);
