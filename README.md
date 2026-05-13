# 📊 Phân cụm tệp khách hàng bằng thuật toán K-Means

Dự án này tập trung vào việc phân tích và phân cụm khách hàng dựa trên dữ liệu hành vi, giúp doanh nghiệp hiểu rõ hơn về các nhóm đối tượng khách hàng khác nhau thông qua thuật toán học máy K-Means.

---

## 📑 Mục lục
- [1. Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
- [2. Cấu trúc dự án](#2-cấu trúc-dự-án)
- [3. Cài đặt và chạy chương trình](#3-cài-đặt-và-chạy-chương-trình)
- [4. Giải thích thuật toán K-Means và Luồng hoạt động](#4-giải-thích-thuật-toán-k-means-và-luồng-hoạt-động)
- [5. Giao diện và Kết quả Demo](#5-giao-diện-và-kết-quả-demo)
- [6. Tác dụng của dự án](#6-tác-dụng-của-dự-án)
- [7. Giấy phép sử dụng (License)](#7-giấy-phép-sử-dụng-license)

---

## 1. Giới thiệu tổng quan

Dự án thực hiện phân cụm khách hàng theo 3 góc nhìn chiến lược:
- **Demographic (Nhân khẩu học):** Tuổi tác, thu nhập, học vấn, tình trạng và cấu trúc gia đình
- **Product & Channel (Sản phẩm & Kênh):** Thói quen mua sắm dựa trên sản phẩm và kênh mua hàng
- **RFM (Recency, Frequency, Monetary):** Giá trị khách hàng dựa trên tần suất và chi tiêu mua hàng

Dự án triển khai cả hai phương pháp: K-Means tự cài đặt (No Library) và K-Means thư viện (Scikit-learn).

---

## 2. Cấu trúc dự án

```
Phân cụm tệp khách hàng bằng thuật toán K-Means/
├── Machine_Learning/
│   ├── dataset/            # Dữ liệu gốc và sau xử lý
│   ├── graph/              # Biểu đồ trực quan (PCA, Elbow)
│   ├── src/                # Mã nguồn chính
│   │   ├── Data Preparation/  # Tiền xử lý dữ liệu
│   │   └── Training/          # Huấn luyện mô hình
│   └── web/                # Giao diện Dashboard (Flask + React)
├── requirements.txt        # Thư viện cần thiết
└── LICENSE.txt             # Giấy phép sử dụng
```

---

## 3. Cài đặt và chạy chương trình

### 3.1. Cài đặt thư viện
Yêu cầu Python 3.9+. Nên sử dụng môi trường ảo (virtualenv):

```bash
# Tạo môi trường ảo
python -m venv .venv

# Kích hoạt môi trường ảo (Windows)
.venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt
```

### 3.2. Cách mở Web Dashboard
Để xem kết quả trực quan trên giao diện Web:

1. **Khởi chạy Backend (Flask):**
   ```bash
   cd Machine_Learning/web
   python app.py
   ```
   Server sẽ chạy tại: `http://localhost:5000`

2. **Truy cập Giao diện:**
   Mở trình duyệt và nhập địa chỉ `http://localhost:5000`. Dashboard sẽ hiển thị tổng quan dữ liệu, biểu đồ phân cụm và các chỉ số đánh giá.

---

## 4. Giải thích thuật toán K-Means và Luồng hoạt động

### 4.1. Thuật toán K-Means là gì?
K-Means là thuật toán học máy không giám sát (Unsupervised Learning) dùng để phân chia dữ liệu thành **K** nhóm (cụm) dựa trên đặc tính tương đồng.
- **Bước 1:** Chọn ngẫu nhiên K điểm làm tâm cụm (Centroids).
- **Bước 2:** Gán mỗi điểm dữ liệu vào cụm có tâm gần nhất (khoảng cách Euclidean).
- **Bước 3:** Cập nhật tâm cụm bằng cách tính trung bình cộng các điểm trong cụm đó.
- **Lặp lại** bước 2 và 3 cho đến khi tâm cụm không đổi.

### 4.2. Luồng hoạt động của Project
1. **Dữ liệu thô:** Đọc từ file TSV `Customer_Behavior.csv`.
2. **Làm sạch:** Xử lý giá trị trống, trùng lặp và loại bỏ Outlier.
3. **Kỹ thuật đặc trưng:** Tính toán các chỉ số RFM và mã hóa biến phân loại.
4. **Chuẩn hóa:** Đưa dữ liệu về cùng thang đo (RobustScaler) để thuật toán K-Means hoạt động chính xác.
5. **Huấn luyện:** Tìm số cụm tối ưu (K) bằng phương pháp **Elbow** (điểm khuỷu tay) và **Silhouette**.
6. **Dashboard:** Hiển thị kết quả thông qua API Flask.

---

## 5. Giao diện và Kết quả Demo

### 🖼️ Ảnh chụp màn hình Web Dashboard
![Web Dashboard Demo]("C:\Users\Admin\OneDrive - Ho Chi Minh City University of Foreign Languages and Information Technology - HUFLIT\Pictures\Screenshots\Screenshot 2026-05-13 105707.png")

### 📈 Kết quả phân cụm tiêu biểu
- **Nhóm 1:** Khách hàng trung thành, chi tiêu cao (Monetary cao, Frequency cao).
- **Nhóm 2:** Khách hàng mới, cần chăm sóc thêm.
- **Nhóm 3:** Khách hàng có nguy cơ rời bỏ (Recency cao).

---

## 6. Tác dụng của dự án

Khi tải dự án này về, bạn sẽ nhận được:
- **Tài liệu học tập:** Cách xử lý dữ liệu thực tế từ A-Z.
- **Mã nguồn mẫu:** Cách tự triển khai thuật toán K-Means mà không dùng thư viện.
- **Kỹ năng Full-stack Data:** Cách kết hợp Machine Learning với Web Dashboard (Flask + React).
- **Ứng dụng thực tế:** Hiểu được cách doanh nghiệp phân nhóm khách hàng để tối ưu hóa chiến dịch Marketing.

---

## 7. Giấy phép sử dụng (License)

**QUY ĐỊNH QUAN TRỌNG:**
- Dự án này chỉ được sử dụng cho mục đích **HỌC TẬP VÀ NGHIÊN CỨU**.
- **NGHIÊM CẤM** sử dụng để buôn bán, kinh doanh hoặc kiếm tiền dưới bất kỳ hình thức nào.
- Vui lòng dẫn nguồn nếu bạn sử dụng mã nguồn này cho mục đích tham khảo bài tập.

---
**Author:** [GonhNiel05](https://github.com/GonhNiel05)
