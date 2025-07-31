const mongoose = require('mongoose');

const TheoDoiMuonSachSchema = new mongoose.Schema({
  NgayMuon: {
    type: Date,
    required: true,
    default: Date.now
  },
  NgayTra: {
    type: Date,
    required: true
  },
  MaSach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sach',
    required: true
  },
  MaDocGia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocGia',
    required: true
  },
  Msnv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NhanVien',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TheoDoiMuonSach', TheoDoiMuonSachSchema);
