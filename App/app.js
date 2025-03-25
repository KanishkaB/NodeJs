/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const socketIO = require('socket.io');
const { authProvider } = require('./auth/AuthProvider');
const config = require('./config');
const { getRandomResponse } = require('./routes/chat');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat');
const purviewRouter = require('./routes/purview');

const app = express();
const server = require('http').createServer(app);
const io = socketIO(server);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: process.env.EXPRESS_SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/chat', chatRouter);
app.use('/purview', purviewRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected');
    let purviewToken = null;

    socket.on('set-purview-token', (token) => {
        console.log('Purview token received');
        purviewToken = token;
    });

    socket.on('typing', () => {
        // Broadcast to all other clients that this user is typing
        socket.broadcast.emit('user typing');
    });

    socket.on('chat message', (message) => {
        console.log('Message received:', message);
        
        // Generate bot response
        const botResponse = getRandomResponse(message);
        
        // Send bot response after a short delay to simulate thinking
        setTimeout(() => {
            socket.emit('chat message', `Bot: ${botResponse}`);
            console.log('Bot response successfully sent via Socket.IO:', botResponse); // Log success
        }, 1000);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = { app, server };
