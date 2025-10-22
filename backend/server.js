// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FEEDBACKS = [];

const PUBLIC_URL = 'https://perorally-heterothallic-yevette.ngrok-free.dev';

// -------------------- HELPER FUNCTIONS --------------------
const cleanSpeech = (value) => {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, '') // remove trailing dots
    .replace(/[^a-z0-9 ]/g, '') // remove special chars
    .split(' ')[0]; // only take first word (in case Twilio adds extra)
};

const wordToNumber = (value) => {
  if (!value) return null;
  const lower = cleanSpeech(value);

  const map = {
    'one': 1, '1': 1, '1st': 1,
    'two': 2, 'to': 2, 'too': 2, '2': 2, '2nd': 2,
    'three': 3, 'tree': 3, '3': 3, '3rd': 3,
    'four': 4, 'for': 4, '4': 4, 'forth': 4,
    'five': 5, '5': 5, 'fifth': 5
  };

  // handle cases like "5.", "2." etc.
  const numeric = parseInt(lower);
  if (!isNaN(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric;
  }

  return map[lower] || null;
};

const isValidRating = (value) => {
  const num = wordToNumber(value);
  return num !== null && num >= 1 && num <= 5;
};

// -------------------- MAKE CALL --------------------
app.post('/makeCall', async (req, res) => {
  const { to, from } = req.body;
  if (!to || !from) return res.status(400).json({ error: 'To and From numbers are required' });

  try {
    const call = await client.calls.create({
      to,
      from,
      url: `${PUBLIC_URL}/greet`
    });
    console.log('[CALL CREATED]', call.sid);
    res.json({ success: true, sid: call.sid });
  } catch (err) {
    console.error('[CALL ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- GREETING --------------------
app.post('/greet', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: 'speech dtmf',
    action: '/startFeedback',
    method: 'POST',
    timeout: 8,
    speechTimeout: 'auto',
    language: 'en-US',
    hints: 'continue'
  });

  gather.say(
    'Hello! This is a call from Amazon. ' +
    'We are calling to collect feedback about your recent order of Boat Rockerz 550 headphones. ' +
    'Please say continue or press any key to start the feedback.'
  );

  twiml.say('No response detected. Let\'s try again.');
  twiml.redirect('/greet');

  res.type('text/xml').send(twiml.toString());
});

// -------------------- START FEEDBACK --------------------
app.post('/startFeedback', (req, res) => {
  const greetingResponse = req.body.SpeechResult || req.body.Digits || null;
  console.log('[GREETING RESPONSE]', greetingResponse);

  if (!greetingResponse) {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I did not get that. Please say continue or press any key.');
    twiml.redirect('/greet');
    return res.type('text/xml').send(twiml.toString());
  }

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect('/askProductRating');
  res.type('text/xml').send(twiml.toString());
});

// -------------------- ASK PRODUCT RATING --------------------
app.post('/askProductRating', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: 'speech dtmf',
    action: '/productRating',
    method: 'POST',
    timeout: 8,
    speechTimeout: 'auto',
    language: 'en-US',
    hints: 'one, two, three, four, five',
    speechModel: 'numbers_and_commands'
  });

  gather.say('First, on a scale of 1 to 5, how would you rate the product you received? Say a number or press a key.');
  twiml.say('No response detected. Let\'s try again.');
  twiml.redirect('/askProductRating');

  res.type('text/xml').send(twiml.toString());
});

// -------------------- PRODUCT RATING --------------------
app.post('/productRating', (req, res) => {
  const ratingRaw = req.body.SpeechResult || req.body.Digits || null;
  console.log('[PRODUCT RATING RAW]', ratingRaw);

  const rating = cleanSpeech(ratingRaw);
  const num = wordToNumber(rating);

  console.log('[PRODUCT RATING CLEANED]', rating, '->', num);

  if (!isValidRating(rating)) {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I did not understand that. Please say a number between one and five.');
    twiml.redirect('/askProductRating');
    return res.type('text/xml').send(twiml.toString());
  }

  req.app.locals.productRating = num;

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect('/askDeliveryRating');
  res.type('text/xml').send(twiml.toString());
});

// -------------------- ASK DELIVERY RATING --------------------
app.post('/askDeliveryRating', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: 'speech dtmf',
    action: '/deliveryRating',
    method: 'POST',
    timeout: 8,
    speechTimeout: 'auto',
    language: 'en-US',
    hints: 'one, two, three, four, five',
    speechModel: 'numbers_and_commands'
  });

  gather.say('Now, on a scale of 1 to 5, how would you rate the delivery service? Say a number or press a key.');
  twiml.say('No response detected. Let\'s try again.');
  twiml.redirect('/askDeliveryRating');

  res.type('text/xml').send(twiml.toString());
});

// -------------------- DELIVERY RATING --------------------
app.post('/deliveryRating', (req, res) => {
  const ratingRaw = req.body.SpeechResult || req.body.Digits || null;
  console.log('[DELIVERY RATING RAW]', ratingRaw);

  const rating = cleanSpeech(ratingRaw);
  const num = wordToNumber(rating);

  console.log('[DELIVERY RATING CLEANED]', rating, '->', num);

  if (!isValidRating(rating)) {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I did not understand that. Please say a number between one and five.');
    twiml.redirect('/askDeliveryRating');
    return res.type('text/xml').send(twiml.toString());
  }

  req.app.locals.deliveryRating = num;

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect('/askFinalReview');
  res.type('text/xml').send(twiml.toString());
});

// -------------------- ASK FINAL REVIEW --------------------
app.post('/askFinalReview', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: 'speech',
    action: '/finalReview',
    method: 'POST',
    timeout: 12,
    speechTimeout: 'auto',
    language: 'en-US'
  });

  gather.say('Finally, please provide any comments or review about the product or delivery.');
  twiml.say('No response detected. Let\'s try again.');
  twiml.redirect('/askFinalReview');

  res.type('text/xml').send(twiml.toString());
});

// -------------------- FINAL REVIEW --------------------
app.post('/finalReview', (req, res) => {
  const review = req.body.SpeechResult || 'no response';
  console.log('[FINAL REVIEW]', review);

  const entry = {
    callSid: req.body.CallSid || 'unknown',
    from: req.body.From || '',
    to: req.body.To || '',
    timestamp: new Date().toISOString(),
    feedback: {
      productRating: req.app.locals.productRating || 'no response',
      deliveryRating: req.app.locals.deliveryRating || 'no response',
      finalReview: review
    }
  };

  FEEDBACKS.push(entry);

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Thank you for your feedback. Goodbye.');
  twiml.hangup();

  res.type('text/xml').send(twiml.toString());
});

// -------------------- LIST FEEDBACKS --------------------
app.get('/feedbacks', (req, res) => {
  res.json({ count: FEEDBACKS.length, feedbacks: FEEDBACKS });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
