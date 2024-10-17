#!/usr/bin/env node

import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes/index.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT) || 5000;


dotenv.config();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded())

app.use(express.json())

// Routes
app.use('/', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
