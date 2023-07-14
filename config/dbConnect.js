const mongoose  = require('mongoose');

const dbConnect = () => {
  return mongoose.connect(process.env.MONGO_DB_URL, {
    useNewUrlParser : true,
    useUnifiedTopology : true
  }).then(() => {
    console.log("Data base is connect")
  }).catch((err) => {
    console.log(err)
  })
}


module.exports = dbConnect;
