const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSenitize = require('express-mongo-sanitize');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes/index');




app.use(cors({
    origin : '*',
    methods : ["GET","POST","PUT","DELETE","PATCH"],
    credentials : true
}))
app.use(express.json({ limit : '10kb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : true }))
app.use(helmet())

if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

const limit = rateLimit({
    max : 3000,
    windowMs : 60 * 60 * 1000,
    message : "Too many request from this ip address, please try after one hour"
})

app.use('/twik', limit);

app.use(express.urlencoded({ extended : true }))

app.use(mongoSenitize());

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app;