const bookService = require('./book.service');
const { uploadToCloudinary, deleteImageFromCloudinary } = require('../../services/cloudinary.service');

function extractPublicIdFromUrl(imageUrl) {
    try {
        console.log('Đang trích xuất publicId từ URL:', imageUrl);

        if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
            console.log('URL không phải từ Cloudinary');
            return null;
        }

        // Tách URL và lấy phần sau '/upload/'
        const parts = imageUrl.split('/upload/');
        if (parts.length < 2) {
            console.log('URL không có phần /upload/');
            return null;
        }

        let pathAfterUpload = parts[1];
        console.log('Path sau upload:', pathAfterUpload);

        // Bỏ version nếu có (vXXXXXXXXXX/)
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
        console.log('Path sau khi bỏ version:', pathAfterUpload);

        // Bỏ các transformations nếu có (như w_500,h_300,c_fill/ etc.)
        const segments = pathAfterUpload.split('/');
        const lastSegment = segments[segments.length - 1];

        // Nếu có nhiều segments và segment cuối có extension, lấy path đầy đủ trừ extension
        let publicId;
        if (segments.length > 1) {
            // Có folder: images/filename.jpg -> images/filename
            publicId = pathAfterUpload.replace(/\.[^/.]+$/, ''); // Bỏ extension cuối
        } else {
            // Không có folder: filename.jpg -> filename
            publicId = lastSegment.replace(/\.[^/.]+$/, '');
        }

        console.log('PublicId được trích xuất:', publicId);
        return publicId;
    } catch (error) {
        console.error('Lỗi khi trích xuất publicId:', error);
        return null;
    }
}

async function addGenre(req, res) {
    try {
        const { Genre } = req.body;
        const genreName = Genre.trim();

        const result = await bookService.addGenre(genreName);

        if (!result) {
            console.log('Thêm thể loại thất bại (đã tồn tại):', genreName);
            return res.status(500).send('Thêm thể loại thất bại');
        }

        res.json(result);
        console.log('Thêm thể loại thành công:', result._id);
    } catch (error) {
        res.status(500).send('Thêm thể loại thất bại');
    }
}

async function getAllGenre(req, res) {
    try {
        const result = await bookService.getAllGenre();
        res.json(result);
        console.log('Lấy tất cả thể loại thành công');
    } catch (error) {
        res.status(500).send('Lấy thể loại thất bại');
    }
}

async function getAllBook(req, res) {
    try {
        const books = await bookService.getAllBook();
        res.json(books);
        console.log('Lấy tất cả sách thành công:', books.length);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sách:', error);
        res.status(500).send('Lấy danh sách sách thất bại');
    }
}

async function getOneBook(req, res) {
    try {
        const { keyword } = req.body;
        const book = await bookService.getOneBook(keyword);
        res.json(book);
        console.log('Lấy sách thành công');
    } catch (error) {
        console.error('Lỗi khi lấy sách:', error);
        res.status(500).send('Lấy sách thất bại');
    }
}

async function addBook(req, res) {
    try {
        const body = req.body;
        const file = req.file;

        const uploadResult = await uploadToCloudinary(file.buffer);
        if (!uploadResult) {
            console.log("Lỗi khi upload ảnh lên cloud");
            return;
        }

        const bookData = {
            TenSach: body.title,
            DonGia: Number(body.price),
            SoQuyen: Number(body.quantity),
            NamXuatBan: Number(body.publicationYear),
            TacGia: body.author,
            MoTaSach: body.description,
            Image: uploadResult.secure_url,
            NhaXuatBan: body.publisher,
            DiaChiNhaXuatBan: body.publisherAddress,
            TheLoai: body.genre
        };

        const result = await bookService.addBook(bookData);
        res.json(result);
        console.log('Thêm sách thành công: ', result._id);
    } catch (error) {
        res.status(500).send('Thêm sách thất bại');
    }
}

async function updateBook(req, res) {
    try {
        const bookId = req.params.id;
        const body = req.body;
        const file = req.file;

        const updateData = {};

        if (body.TenSach) updateData.TenSach = body.TenSach;
        if (body.DonGia) updateData.DonGia = Number(body.DonGia);
        if (body.SoQuyen) updateData.SoQuyen = Number(body.SoQuyen);
        if (body.NamXuatBan) updateData.NamXuatBan = Number(body.NamXuatBan);
        if (body.TacGia) updateData.TacGia = body.TacGia;
        if (body.MoTaSach) updateData.MoTaSach = body.MoTaSach;
        if (body.TenNXB) updateData.TenNXB = body.TenNXB;
        if (body.DiaChiNXB) updateData.DiaChiNXB = body.DiaChiNXB;
        if (body.TenTheLoai) updateData.TenTheLoai = body.TenTheLoai;

        let oldImageUrl = null;

        // Lấy ảnh cũ trước khi update (nếu có file mới)
        if (file) {
            try {
                const currentBook = await require('../../models/sachModel').findById(bookId);
                if (currentBook && currentBook.Image) {
                    oldImageUrl = currentBook.Image;
                }
            } catch (error) {
                console.warn('Không thể lấy thông tin sách cũ:', error.message);
            }

            // Upload ảnh mới
            const uploadResult = await uploadToCloudinary(file.buffer);
            if (!uploadResult) {
                console.log("Lỗi khi upload ảnh lên cloud");
                return res.status(500).send('Lỗi khi upload ảnh mới');
            }
            updateData.Image = uploadResult.secure_url;
        }

        // Update sách
        const result = await bookService.updateBook(bookId, updateData);

        // Response trước, xóa ảnh cũ sau (background)
        res.json(result);
        console.log('Cập nhật sách thành công:', bookId);

        // Xóa ảnh cũ trong background (không block response)
        if (file && oldImageUrl) {
            setImmediate(async () => {
                try {
                    const oldPublicId = extractPublicIdFromUrl(oldImageUrl);
                    if (oldPublicId) {
                        await deleteImageFromCloudinary(oldPublicId);
                        console.log('Đã xóa ảnh cũ từ Cloudinary:', oldPublicId);
                    }
                } catch (deleteError) {
                    console.warn('Không thể xóa ảnh cũ:', deleteError.message);
                }
            });
        }

    } catch (error) {
        console.error('Lỗi khi cập nhật sách:', error);
        res.status(500).send('Cập nhật sách thất bại');
    }
}

async function deleteBook(req, res) {
    try {
        const { id } = req.params;
        const result = await bookService.deleteBook(id);
        res.json(result);
        console.log('Xóa sách thành công');
    } catch (error) {
        console.error('Lỗi khi xóa sách:', error);
        res.status(500).send('Xóa sách thất bại');
    }
}

module.exports = {
    addBook,
    getAllBook,
    addGenre,
    getAllGenre,
    getOneBook,
    updateBook,
    deleteBook
};