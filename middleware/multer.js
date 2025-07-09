import multer from "multer";
import path from 'path'

// storage config
// upload file temporary to local server => public/uploads folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads');   
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique file name
    }
});

export const upload = multer({storage: storage});