const app = require('./app');
const dbConnect = require('./config/dbConnect');
process.on('uncaughtException', (err) => {
    console.log(err);
    process.exit(1)
})
const http = require('http');
require('dotenv').config();
const server = http.createServer(app);


dbConnect()

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port : ${process.env.PORT}`)
})

process.on('unhandledRejection', (err) => {
    console.log(err)
    server.close(() => {
        process.exit(1)
    })
})