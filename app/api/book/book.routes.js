const express = require('express')
const upload = require('../../config/multer');
const
    {   
        addGenre,
        getAllGenre,
        addBook,
        getAllBook,
        updateBook,
        getOneBook,
        deleteBook,
        getBookById,
        lendBook,
        getInfoLendBook,
        getTrackBorrowBook,
        updateBorrowStatus,
        extendBorrowTime
    } = require('./book.controller')

const router = express.Router()

router.post('/getBookById', getBookById);
router.post('/getOneBook', getOneBook);
router.get('/getAllBook', getAllBook);
router.post('/addbook', upload.single('image'), addBook);
router.post('/updateBook/:id', upload.single('image'), updateBook);
router.post('/deleteBook/:id', deleteBook);

router.post('/addGenre', addGenre);
router.get('/getAllGenre', getAllGenre);

router.post('/lendBook', lendBook);
router.post('/getInfoLendBook', getInfoLendBook);
router.get('/getTrackBorrowBook', getTrackBorrowBook);
router.post('/updateBorrowStatus', updateBorrowStatus);
router.post('/extendBorrowTime', extendBorrowTime);

module.exports = router
