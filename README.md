# 📊 Phân cụm tệp khách hàng bằng thuật toán K-Means

Dự án này tập trung vào việc phân tích và phân cụm khách hàng dựa trên dữ liệu hành vi, giúp doanh nghiệp hiểu rõ hơn về các nhóm đối tượng khách hàng khác nhau thông qua thuật toán học máy K-Means.

---

## 📑 Mục lục
- [1. Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
- [2. Cấu trúc dự án](#2-cấu trúc-dự-án)
- [3. Cài đặt và chạy chương trình](#3-cài-đặt-và-chạy-chương-trình)
- [4. Quy trình xử lý dữ liệu (Pipeline)](#4-quy-trình-xử-lý-dữ-liệu-pipeline)
- [5. Kết quả phân cụm](#5-kết-quả-phân-cụm)
- [6. Giao diện Web Dashboard](#6-giao-diện-web-dashboard)
- [7. Đóng góp](#7-đóng-góp)

---

## 1. Giới thiệu tổng quan

Dự án thực hiện phân cụm khách hàng theo 3 góc nhìn chiến lược:
- **Demographic (Nhân khẩu học):** Dựa trên tuổi tác, thu nhập, trình độ học vấn và tình trạng gia đình.
- **Product & Channel (Sản phẩm & Kênh):** Phân tích thói quen chi tiêu cho các loại sản phẩm và ưu tiên kênh mua sắm (Web, Catalog, Store).
- **RFM (Recency, Frequency, Monetary):** Đánh giá giá trị khách hàng dựa trên độ gần đây, tần suất và giá trị giao dịch.

Dự án triển khai cả hai phương pháp:
1. **K-Means tự cài đặt (No Library):** Hiểu rõ bản chất thuật toán.
2. **K-Means thư viện (With Library):** Sử dụng `scikit-learn` để tối ưu hiệu năng.

---

## 2. Cấu trúc dự án

```
Phân cụm tệp khách hàng bằng thuật toán K-Means/
├── Machine_Learning/
│   ├── dataset/            # 📁 Dữ liệu gốc và dữ liệu sau xử lý
│   ├── graph/              # 📊 Biểu đồ trực quan hóa (PCA, Elbow, Silhouette)
│   ├── report/             # 📝 Báo cáo text chi tiết từng giai đoạn
│   ├── src/                # 💻 Mã nguồn chính
│   │   ├── Data Preparation/  # 🛠 Tiền xử lý dữ liệu
│   │   │   ├── Data_Cleaning.py      # Làm sạch và chuẩn hóa dữ liệu
│   │   │   ├── Feature_Engineering.py # Trích xuất đặc trưng mới
│   │   │   └── Feature_Scaling.py     # Chuẩn hóa thang đo (Standard/Robust)
│   │   └── Training/          # 🧠 Huấn luyện mô hình
│   │       ├── No Library/    # K-Means tự cài đặt từ đầu
│   │       └── With Library/  # K-Means sử dụng Scikit-learn
│   └── web/                # 🌐 Giao diện người dùng
│       ├── app.py             # Backend Flask API
│       └── frontend/          # Mã nguồn React Dashboard
├── requirements.txt        # 📦 Danh sách thư viện cần thiết
├── README.md               # 📖 Hướng dẫn sử dụng
└── .gitignore              # 🛠 Cấu hình Git
```

### 2.1. Các file quan trọng:
- **`Data_Cleaning.py`**: Xử lý nhiễu, giá trị thiếu và chuẩn hóa định dạng dữ liệu.
- **`Feature_Engineering.py`**: Tạo ra các biến có ý nghĩa kinh doanh từ dữ liệu thô (ví dụ: RFM segments).
- **`KMeans_RFM_WL.py`**: Script huấn luyện mô hình phân cụm RFM sử dụng thư viện chuyên dụng.
- **`app.py`**: Khởi chạy server cung cấp API dữ liệu và biểu đồ cho Dashboard.

---

## 3. Cài đặt và chạy chương trình

### 3.1. Yêu cầu hệ thống
- Python 3.9 trở lên
- Trình quản lý gói `pip`

### 3.2. Cài đặt thư viện
```bash
# Cài đặt tất cả các thư viện cần thiết
pip install -r requirements.txt
```

### 3.3. Chạy toàn bộ Pipeline
Bạn có thể chạy tuần tự các script trong `Machine_Learning/src/` để thực hiện quy trình từ dữ liệu thô đến kết quả phân cụm.

---

## 4. Quy trình xử lý dữ liệu (Pipeline)

### Bước 1: Phân tích và Làm sạch dữ liệu
- Loại bỏ giá trị thiếu (Missing values), giá trị trùng lặp (Duplicates).
- Xử lý các giá trị ngoại lai (Outliers).
- Chỉnh sửa và chuẩn hóa các cột phân loại (Education, Marital_Status).

### Bước 2: Kỹ thuật đặc trưng (Feature Engineering)
- Tạo các thuộc tính mới như: `Age`, `Total_Spent`, `Dependency_Ratio`.
- Trích xuất 3 tập đặc trưng chính: Demographic, ProductChannel, và RFM.

### Bước 3: Chuẩn hóa dữ liệu (Feature Scaling)
- Sử dụng `StandardScaler` và `RobustScaler` để đưa dữ liệu về cùng một thang đo.

### Bước 4: Huấn luyện mô hình
- Xác định số cụm tối ưu (K) bằng phương pháp Elbow và Silhouette.
- Thực hiện phân cụm và trực quan hóa kết quả bằng PCA (2D/3D).

---

## 5. Kết quả phân cụm

Dưới đây là tóm tắt chỉ số Silhouette và Davies-Bouldin cho các chiến lược (sử dụng RobustScaler):

| Chiến lược | Số cụm (K) | Silhouette Score | Davies-Bouldin Index |
|---|---|---|---|
| Demographic | 3 | 0.3506 | 0.9987 |
| Product+Channel | 4 | 0.2848 | 1.0968 |
| RFM | 2 | 0.4394 | 0.8860 |

---

## 6. Giao diện Web Dashboard

Dự án cung cấp một Dashboard trực quan để theo dõi kết quả.

### Chạy Backend (Flask API)
```bash
cd Machine_Learning/web
python app.py
```
API sẽ khởi chạy tại: `http://localhost:5000`

### Chạy Frontend (React)
Nếu đã có bản build trong `dist`, Flask sẽ tự động phục vụ giao diện tại trang chủ. Nếu muốn phát triển thêm:
```bash
cd Machine_Learning/web/frontend
npm install
npm run dev
```

---

## 7. Đóng góp
Dự án được phát triển nhằm mục đích học tập và nghiên cứu về phân tích dữ liệu khách hàng. Mọi đóng góp xin gửi về qua các Issue hoặc Pull Request trên GitHub.

---
**Author:** [GonhNiel05](https://github.com/GonhNiel05)
