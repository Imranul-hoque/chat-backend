const bcrypt = require('bcrypt');

const customBcrypt = async (otp) => {
    return await bcrypt.hash(otp, 12);
}
const compareBcrypt = async (user_otp, db_otp) => {
    return await bcrypt.compare(user_otp, db_otp);
}

module.exports = {customBcrypt, compareBcrypt};