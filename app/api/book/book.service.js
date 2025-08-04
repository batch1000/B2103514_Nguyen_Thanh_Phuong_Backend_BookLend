const Sach = require('../../models/sachModel');
const NhaXuatBan = require('../../models/nhaxuatbanModel');
const TheLoaiSach = require('../../models/theloaisachModel');
const TheoDoiMuonSach = require('../../models/theodoimuonsachModel')
const DocGia = require('../../models/docgiaModel')

const { deleteImageFromCloudinary } = require('../../services/cloudinary.service');

async function addGenre(genreName) {
  const existing = await TheLoaiSach.findOne({ TenTheLoai: genreName });
  if (existing) {
    return null;
  }

  const newGenre = new TheLoaiSach({ TenTheLoai: genreName });
  const savedGenre = await newGenre.save();

  return savedGenre;
}

async function getAllGenre() {
  return await TheLoaiSach.find().sort({ TenTheLoai: 1 });
}

async function generateMaSach() {
  const latestBook = await Sach.findOne().sort({ createdAt: -1 }).exec();
  let nextNumber = 1;

  if (latestBook && latestBook.MaSach) {
    const match = latestBook.MaSach.match(/S(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return nextNumber < 10000
    ? `S${nextNumber.toString().padStart(4, '0')}`
    : `S${nextNumber}`;
}

async function generateMaNXB() {
  const latestNXB = await NhaXuatBan.findOne().sort({ createdAt: -1 }).exec();
  let nextNumber = 1;

  if (latestNXB && latestNXB.MaNXB) {
    const match = latestNXB.MaNXB.match(/NXB(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return nextNumber < 10000
    ? `NXB${nextNumber.toString().padStart(4, '0')}`
    : `NXB${nextNumber}`;
}

async function getAllBook() {
  try {
    const books = await Sach.find()
      .populate('MaNXB', 'TenNXB DiaChi')
      .populate('MaTheLoai', 'TenTheLoai')
      .exec();

    return books;
  } catch (err) {
    console.error('Lỗi khi truy vấn tất cả sách:', err);
    throw err;
  }
}

async function getOneBook(keyword) {
  try {
    let query = {};

    if (/^S\d+$/i.test(keyword)) {
      query.MaSach = keyword.toUpperCase();
    } else {
      query.TenSach = { $regex: `^${keyword}$`, $options: 'i' };
    }

    const book = await Sach.findOne(query)
      .populate('MaNXB', 'TenNXB DiaChi')
      .populate('MaTheLoai', 'TenTheLoai')
      .exec();

    return book;
  } catch (err) {
    console.error('Lỗi khi truy vấn một sách:', err);
    throw err;
  }
}

async function getBookById(id) {
  try {
    const book = await Sach.findById(id)
      .populate('MaNXB', 'TenNXB DiaChi')
      .populate('MaTheLoai', 'TenTheLoai')
      .exec();

    return book;
  } catch (err) {
    console.error('Lỗi khi truy vấn sách theo ID:', err);
    throw err;
  }
}

async function addBook(data) {
  try {
    let nxb = await NhaXuatBan.findOne({ TenNXB: data.NhaXuatBan }).exec();

    if (!nxb) {
      const maNXB = await generateMaNXB();
      nxb = await NhaXuatBan.create({
        MaNXB: maNXB,
        TenNXB: data.NhaXuatBan,
        DiaChi: data.DiaChiNhaXuatBan
      });
    }

    const theLoai = await TheLoaiSach.findOne({ TenTheLoai: data.TheLoai }).exec();
    if (!theLoai) {
      throw new Error(`Thể loại "${data.TheLoai}" không tồn tại`);
    }

    const maSach = await generateMaSach();

    const newBook = await Sach.create({
      MaSach: maSach,
      TenSach: data.TenSach,
      DonGia: data.DonGia,
      SoQuyen: data.SoQuyen,
      NamXuatBan: data.NamXuatBan,
      TacGia: data.TacGia,
      MoTaSach: data.MoTaSach,
      Image: data.Image,
      MaNXB: nxb._id,
      MaTheLoai: theLoai._id
    });

    return newBook;
  } catch (err) {
    console.error('Lỗi khi thêm sách:', err);
    throw err;
  }
}

async function updateBook(id, data) {
  try {
    const updateData = {};

    if (data.TenNXB) {
      let nxb = await NhaXuatBan.findOne({ TenNXB: data.TenNXB }).exec();

      if (!nxb) {
        const maNXB = await generateMaNXB();
        nxb = await NhaXuatBan.create({
          MaNXB: maNXB,
          TenNXB: data.TenNXB,
          DiaChi: data.DiaChiNXB || ""
        });
      } else if (data.DiaChiNXB) {
        nxb.DiaChi = data.DiaChiNXB;
        await nxb.save();
      }

      updateData.MaNXB = nxb._id;
    }

    if (data.TenTheLoai) {
      const theLoai = await TheLoaiSach.findOne({ TenTheLoai: data.TenTheLoai }).exec();
      if (!theLoai) {
        throw new Error(`Thể loại "${data.TenTheLoai}" không tồn tại`);
      }
      updateData.MaTheLoai = theLoai._id;
    }

    if (data.TenSach) updateData.TenSach = data.TenSach;
    if (data.DonGia) updateData.DonGia = Number(data.DonGia);
    if (data.SoQuyen) updateData.SoQuyen = Number(data.SoQuyen);
    if (data.NamXuatBan) updateData.NamXuatBan = Number(data.NamXuatBan);
    if (data.TacGia) updateData.TacGia = data.TacGia;
    if (data.MoTaSach) updateData.MoTaSach = data.MoTaSach;
    if (data.Image) updateData.Image = data.Image;

    const updatedBook = await Sach.findByIdAndUpdate(id, updateData, { new: true });

    return updatedBook;
  } catch (err) {
    console.error('Lỗi khi cập nhật sách:', err);
    throw err;
  }
}

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

async function deleteBook(id) {
  try {
    const book = await Sach.findById(id);

    if (!book) {
      throw new Error('Không tìm thấy sách để xóa');
    }

    const publicId = extractPublicIdFromUrl(book.Image);

    const result = await Sach.findByIdAndDelete(id);

    if (publicId) {
      try {
        await deleteImageFromCloudinary(publicId);
        console.log('Đã xóa ảnh từ Cloudinary:', publicId);
      } catch (imageError) {
        console.warn('Không thể xóa ảnh từ Cloudinary:', imageError.message);
      }
    } else {
      console.warn('Không thể trích xuất publicId từ URL:', book.Image);
    }

    return result;
  } catch (err) {
    console.error('Lỗi khi xóa sách:', err);
    throw err;
  }

}

async function lendBook(data) {
  try {
    const { MaSach, MaDocGia, SoLuongMuon } = data;

    const record = new TheoDoiMuonSach({
      MaSach,
      MaDocGia,
      SoLuong: SoLuongMuon,
      TrangThai: 'pending'
    });

    const savedRecord = await record.save();
    return savedRecord;

  } catch (err) {
    console.error('Lỗi khi mượn sách:', err);
    throw err;
  }
}

async function getInfoLendBook(data) {
  try {
      const { MaSach, MaDocGia } = data;
      
      const lendRecord = await TheoDoiMuonSach.findOne({
          MaSach,
          MaDocGia,
          TrangThai: { $in: ['pending', 'approved', 'borrowing'] }
      }).sort({ createdAt: -1 }); // Lấy record mới nhất
      return lendRecord;
  } catch (err) {
      console.error('Lỗi khi lấy thông tin mượn sách:', err);
      throw err;
  }
}

async function getTrackBorrowBook() {
  try {
      const trackBorrowList = await TheoDoiMuonSach.find()
          .populate({
              path: 'MaSach',
              select: 'MaSach TenSach TacGia DonGia SoQuyen NamXuatBan Image MoTaSach'
          })
          .populate({
              path: 'MaDocGia',
              select: 'MaDocGia HoLot Ten NgaySinh Phai DiaChi DienThoai'
          })
          .populate({
              path: 'Msnv',
              select: 'Msnv HoTenNV ChucVu'
          })
          .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất
          
      return trackBorrowList;
  } catch (err) {
      console.error('Lỗi khi lấy danh sách theo dõi mượn sách:', err);
      throw err;
  }
}

async function updateBorrowStatus(requestId, adminId, status) {
  try {
    const updateFields = {
      TrangThai: status,
      Msnv: adminId
    };

    // Nếu duyệt (approved) thì cập nhật NgayMuon và NgayTra
    if (status === 'approved') {
      const now = new Date();
      updateFields.NgayMuon = now;
      updateFields.NgayTra = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Cộng 7 ngày
    }

    const updated = await TheoDoiMuonSach.findByIdAndUpdate(
      requestId,
      updateFields,
      { new: true }
    );

    return updated;
  } catch (err) {
    console.error('Lỗi khi cập nhật trạng thái mượn sách:', err);
    throw err;
  }
}

async function extendBorrowTime(requestId, adminId, newDueDate) {
  try {
    const request = await TheoDoiMuonSach.findById(requestId);

    if (!request) {
      throw new Error('Không tìm thấy yêu cầu mượn sách');
    }

    if (request.TrangThai !== 'approved') {
      throw new Error('Chỉ có thể gia hạn cho yêu cầu đã được duyệt');
    }

    if (!request.NgayTra) {
      throw new Error('Không có ngày trả hiện tại để gia hạn');
    }

    if (request.DaGiaHan) {
      throw new Error('Yêu cầu này đã được gia hạn trước đó');
    }

    const newDate = new Date(newDueDate);

    if (newDate <= request.NgayTra) {
      throw new Error('Ngày gia hạn phải sau ngày trả hiện tại');
    }

    // Cập nhật
    request.NgayTra = newDate;
    request.Msnv = adminId;
    request.DaGiaHan = true;

    const updated = await request.save();
    return updated;
  } catch (err) {
    console.error('Lỗi khi gia hạn mượn sách:', err);
    throw err;
  }
}


module.exports = {
  addBook,
  getAllBook,
  addGenre,
  getAllGenre,
  getOneBook,
  updateBook,
  deleteBook,
  getBookById,
  lendBook,
  getInfoLendBook,
  getTrackBorrowBook,
  updateBorrowStatus,
  extendBorrowTime
};