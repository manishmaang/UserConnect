const multer = require('multer');
const crypto = require('crypto');
const path = require('path');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
      crypto.randomBytes(12,function(err,name){
          const filename = name.toString("hex") + path.extname(file.originalname);
          cb(null, filename);
      })
    }
  })
  
const upload = multer({ storage: storage });

//es upload me sari multer ki functionality hai to ab ise export krna hoga 
module.exports = upload;

