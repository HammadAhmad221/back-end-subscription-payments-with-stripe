const express = require('express');
const Imap = require('imap');
const router = express.Router();

// Configure your email and password
// const email = 'dpointlogistics@gmail.com';
// const password = 'nauq uhcs nvdr kazz'; 
// const password = process.env.GMAIL_PASS;
//Email Subject Check
// const invoiceSubjectRegex = /^Invoice\s#[0-9]+\sCreated$/;
const invoiceSubjectRegex = /^Your\sInvoice\sis\screated\sby\sID#[0-9]+$/;

router.get('/emails', (req, res) => {
  const imap = new Imap({
    user: 'dpointlogistics@gmail.com',
    password: process.env.GMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
    connTimeout: 30000,
    authTimeout: 30000,
  });
  imap.once('ready', () => {
    imap.openBox('[Gmail]/Sent Mail', true, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        return res.status(500).json({ message: 'Error opening inbox', error: err });
      }
      imap.search(['ALL'], (err, results) => {
        if (err) {
          console.error('Error searching inbox:', err);
          return res.status(500).json({ message: 'Error searching inbox', error: err });
        }

        if (!results.length) {
          console.log('No emails found');
          return res.status(200).json({ message: 'No emails found' });
        }
        const f = imap.fetch(results, { bodies: '' });
        const emails = [];

        f.on('message', (msg) => {
          msg.on('body', (stream) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.on('end', () => {
              const parsedEmail = Imap.parseHeader(buffer);
              // console.log('Parsed email:', parsedEmail);
              const subject = parsedEmail.subject ? parsedEmail.subject[0] : '';
              if (invoiceSubjectRegex.test(subject)){
                emails.push(parsedEmail)
                emails.sort((a, b) => {
                  const numberInA = parseInt(a.subject[0].match(/#(\d+)/)[1], 10); // Extract the number after #
                  const numberInB = parseInt(b.subject[0].match(/#(\d+)/)[1], 10); // Extract the number after #
                  
                  return numberInB - numberInA; // Sort in descending order
                });
              }
            });
          });
        });

        f.on('end', () => {
          // console.log('All emails fetched:', emails); 
          imap.end();
          return res.status(200).json(emails.length ? emails : { message: 'No emails found' });
        });

        f.on('error', (err) => {
          console.error('Error fetching emails:', err);
          imap.end();
          return res.status(500).json({ message: 'Error fetching emails', error: err });
        });
      });
    });
  });

  imap.connect();
});

module.exports = router;
