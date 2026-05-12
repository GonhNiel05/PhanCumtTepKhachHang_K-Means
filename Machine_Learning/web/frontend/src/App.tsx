import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

type Language = 'vi' | 'en'
type Theme = 'dark' | 'light'
type TabKey =
  | 'overview'
  | 'rfm'
  | 'demographic'
  | 'productchannel'
  | 'processing'
  | 'dataset'
  | 'metrics'
  | 'conclusion'
type SegmentKey = 'rfm' | 'demographic' | 'productchannel'
type VersionKey = 'library' | 'nolibrary'
type ProcessingKey = 'analysis' | 'cleaning' | 'feature'

type OverviewData = {
  total_customers: number
  total_features: number
  segments: string[]
  implementations: string[]
  dataset_files: string[]
  columns?: string[]
}

type MetricsData = {
  silhouette_score?: number
  davies_bouldin_index?: number
  cluster_distribution?: Record<string, number>
  n_clusters?: number
  n_rows?: number
}

type GraphListData = {
  graph_key: string
  files: string[]
  count: number
}

type DatasetSampleData = {
  columns: string[]
  rows: Array<Array<string | number | null>>
  total_shown: number
}

type SummaryData = Record<string, MetricsData & { error?: string }>

type LoadState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  data?: T
  error?: string
}

type GalleryItem = { url: string; name: string }

const copy = {
  vi: {
    appName: 'Phân cụm khách hàng bằng thuật toán K-Means',
    appShort: 'K-Means',
    appAccent: 'Phân cụm',
    footerTag: 'Phân cụm khách hàng bằng thuật toán K-Means',
    nav: {
      overview: 'Tổng quan',
      segments: 'Phân cụm khách hàng',
      rfm: 'RFM',
      demographic: 'Nhân khẩu học',
      productchannel: 'Sản phẩm & Kênh',
      processingGroup: 'Tiền xử lý',
      processing: 'Dữ liệu',
      dataset: 'Bộ dữ liệu',
      analysisGroup: 'Phân tích',
      metrics: 'So sánh Metrics',
      conclusion: 'Kết luận',
    },
    status: {
      connecting: 'Đang kết nối...',
      online: 'API Online',
      error: 'API Error',
      offline: 'Không kết nối được API',
    },
    overview: {
      title: 'Phân cụm khách hàng bằng thuật toán K-Means',
      subtitle:
        'Phân tích và phân cụm khách hàng sử dụng thuật toán K-Means với 3 chiến lược phân đoạn: RFM, Nhân khẩu học và Sản phẩm & Kênh',
      pipelineTitle: 'Pipeline phân tích',
      segmentsTitle: 'Kết quả phân cụm theo chiến lược',
    },
    kpi: {
      customers: 'Khách hàng',
      features: 'Đặc trưng gốc',
      segments: 'Chiến lược phân đoạn',
      implementations: 'Triển khai thuật toán',
    },
    pipelineSteps: [
      {
        title: 'Thu thập & Làm sạch',
        desc: 'Xử lý missing values, outliers, duplicates từ dữ liệu thô Customer Behavior',
      },
      {
        title: 'Feature Engineering',
        desc: 'Tạo RFM features, PCA components, Income per family member',
      },
      {
        title: 'Feature Scaling',
        desc: 'Standard Scaler & Robust Scaler để chuẩn hóa dữ liệu',
      },
      {
        title: 'K-Means Training',
        desc: 'Elbow + Silhouette voting để chọn K tối ưu, với và không có library',
      },
    ],
    segmentCards: {
      rfm: {
        title: 'Recency · Frequency · Monetary',
        desc: 'Phân cụm dựa trên hành vi mua hàng gần đây, tần suất và giá trị chi tiêu',
      },
      demographic: {
        title: 'Nhân khẩu học',
        desc: 'Phân cụm theo độ tuổi, học vấn, thu nhập, tình trạng gia đình',
      },
      productchannel: {
        title: 'Sản phẩm & Kênh mua hàng',
        desc: 'Phân cụm theo loại sản phẩm ưa thích và kênh mua hàng',
      },
    },
    meaning: {
      title: 'Ý nghĩa 3 phân loại',
      items: [
        {
          title: 'Nhân khẩu học (Demographic)',
          question: '“Khách hàng là ai?”',
          desc: 'Tập trung vòng đời, tuổi tác và cấu trúc gia đình; tạo các biến Age, Life_Stage và Dependency_Ratio.',
        },
        {
          title: 'Hành vi mua sắm (Product & Channel)',
          question: '“Khách hàng mua sắm như thế nào?”',
          desc: 'Tập trung thói quen mua sắm, đa dạng sản phẩm và kênh ưa thích; dùng Product_HHI, Store_Preference và Total_Spent.',
        },
        {
          title: 'Giá trị khách hàng (RFM)',
          question: '“Khách hàng mang lại giá trị bao nhiêu?”',
          desc: 'Tập trung giá trị kinh tế; mở rộng RFM với Income và AvgPerPurchase để đo sức mua và tần suất.',
        },
      ],
    },
    tabs: {
      rfm: {
        title: 'Phân cụm RFM',
        subtitle: 'Recency · Income per Family Member · Total Purchases · Avg Per Purchase',
      },
      demographic: {
        title: 'Phân cụm Nhân khẩu học',
        subtitle: 'Age · Education · Income · Marital Status · Family Size',
      },
      productchannel: {
        title: 'Phân cụm Sản phẩm & Kênh',
        subtitle: 'Wine · Meat · Fish · Fruits · Gold · Web · Catalog · Store',
      },
    },
    processing: {
      title: 'Tiền xử lý dữ liệu',
      subtitle: 'Data Wrangling · Outlier Detection · Cleaning · Feature Engineering',
      analysis: 'Phân tích cơ bản',
      cleaning: 'Làm sạch dữ liệu',
      feature: 'Feature Engineering',
    },
    dataset: {
      title: 'Khám phá bộ dữ liệu',
      subtitle: '100 dòng đầu của Customer_Behavior_cleaned.csv',
      loading: 'Đang tải dữ liệu...',
    },
    metrics: {
      title: 'So sánh Metrics',
      subtitle: 'Silhouette Score · Davies-Bouldin Index · Cluster Distribution',
      loading: 'Đang tính toán...',
      labels: {
        silhouette: 'Silhouette Score ↑',
        db: 'Davies-Bouldin ↓',
        clusters: 'Số cụm',
        customers: 'Số khách hàng',
      },
    },
    buttons: {
      withLibrary: '🔬 With Library (sklearn)',
      noLibrary: '⚙️ No Library (scratch)',
    },
    labels: {
      silhouette: 'Silhouette',
      dbIndex: 'Davies-Bouldin',
      clusters: 'Số cụm',
      rows: 'Số dòng',
      loading: 'Đang tải...',
      graphNotFound: '📂 Không tìm thấy biểu đồ',
      metricsUnavailable: 'Metrics: chưa có nhãn cụm trong CSV',
      errorGraphs: '⚠️ Lỗi tải biểu đồ',
    },
    conclusion: {
      title: 'Kết luận',
      subtitle: 'Tổng hợp kết quả phân cụm và những điểm cần lưu ý',
      resultsTitle: 'Kết quả đạt được',
      results: [
        'Demographic: 3 cụm theo tuổi, thu nhập và tỉ lệ phụ thuộc; phản ánh giai đoạn cuộc sống.',
        'RFM: 2 cụm giá trị cao/thấp với Silhouette cao nhất (~0.4394), hỗ trợ chiến lược giữ chân.',
        'Product+Channel: 4 cụm hành vi (Wine Enthusiasts, Balanced Buyers, Premium Product Seekers, Online Engagers).',
      ],
      limitationsTitle: 'Hạn chế & lưu ý',
      limitations: [
        'Silhouette 0.28–0.44 cho thấy ranh giới cụm chưa thật sự rõ.',
        'Một số khách hàng nằm ở ranh giới cụm (Silhouette âm).',
        'Elbow và Silhouette đôi khi mâu thuẫn, cần cân nhắc yếu tố kinh doanh.',
        'Dữ liệu khách hàng đa chiều, có ngoại lệ tự nhiên.',
      ],
      summary:
        'Nhìn chung, các cụm mang ý nghĩa kinh doanh thực tế, giúp định hình chiến lược marketing và chăm sóc khách hàng theo phân khúc.',
    },
    toggles: {
      themeLabel: 'Giao diện',
      light: 'Sáng',
      dark: 'Tối',
      languageLabel: 'Ngôn ngữ',
    },
  },
  en: {
    appName: 'K-Means for Customer Clustering',
    appShort: 'K-Means',
    appAccent: 'Clustering',
    footerTag: 'K-Means for Customer Clustering',
    nav: {
      overview: 'Overview',
      segments: 'Customer Segmentation',
      rfm: 'RFM',
      demographic: 'Demographic',
      productchannel: 'Product & Channel',
      processingGroup: 'Preprocessing',
      processing: 'Data',
      dataset: 'Dataset',
      analysisGroup: 'Analysis',
      metrics: 'Metrics Comparison',
      conclusion: 'Conclusion',
    },
    status: {
      connecting: 'Connecting...',
      online: 'API Online',
      error: 'API Error',
      offline: 'Cannot reach API',
    },
    overview: {
      title: 'K-Means for Customer Clustering',
      subtitle:
        'Analyze and cluster customers using K-Means with three segmentation strategies: RFM, Demographic, and Product & Channel',
      pipelineTitle: 'Analysis pipeline',
      segmentsTitle: 'Segmentation results by strategy',
    },
    kpi: {
      customers: 'Customers',
      features: 'Raw features',
      segments: 'Segmentation strategies',
      implementations: 'Algorithm implementations',
    },
    pipelineSteps: [
      {
        title: 'Collect & Clean',
        desc: 'Handle missing values, outliers, duplicates from raw Customer Behavior data',
      },
      {
        title: 'Feature Engineering',
        desc: 'Create RFM features, PCA components, and income per family member',
      },
      {
        title: 'Feature Scaling',
        desc: 'Standard Scaler and Robust Scaler to normalize data',
      },
      {
        title: 'K-Means Training',
        desc: 'Elbow + Silhouette voting to select optimal K, with and without a library',
      },
    ],
    segmentCards: {
      rfm: {
        title: 'Recency · Frequency · Monetary',
        desc: 'Clusters based on recent purchasing behavior, frequency, and monetary value',
      },
      demographic: {
        title: 'Demographic',
        desc: 'Clusters by age, education, income, and family status',
      },
      productchannel: {
        title: 'Product & Channel',
        desc: 'Clusters by preferred product types and purchase channels',
      },
    },
    meaning: {
      title: 'Why these three segmentations',
      items: [
        {
          title: 'Demographic',
          question: '“Who are the customers?”',
          desc: 'Focuses on life stage, age, and family structure; uses Age, Life_Stage, and Dependency_Ratio.',
        },
        {
          title: 'Product & Channel',
          question: '“How do they shop?”',
          desc: 'Focuses on shopping habits, product diversity, and preferred channels; uses Product_HHI, Store_Preference, and Total_Spent.',
        },
        {
          title: 'RFM Value',
          question: '“How much value do they bring?”',
          desc: 'Focuses on economic value; extends RFM with Income and AvgPerPurchase to measure purchasing power.',
        },
      ],
    },
    tabs: {
      rfm: {
        title: 'RFM Clustering',
        subtitle: 'Recency · Income per Family Member · Total Purchases · Avg Per Purchase',
      },
      demographic: {
        title: 'Demographic Clustering',
        subtitle: 'Age · Education · Income · Marital Status · Family Size',
      },
      productchannel: {
        title: 'Product & Channel Clustering',
        subtitle: 'Wine · Meat · Fish · Fruits · Gold · Web · Catalog · Store',
      },
    },
    processing: {
      title: 'Data preprocessing',
      subtitle: 'Data Wrangling · Outlier Detection · Cleaning · Feature Engineering',
      analysis: 'Basic Analysis',
      cleaning: 'Data Cleaning',
      feature: 'Feature Engineering',
    },
    dataset: {
      title: 'Dataset explorer',
      subtitle: 'First 100 rows of Customer_Behavior_cleaned.csv',
      loading: 'Loading data...',
    },
    metrics: {
      title: 'Metrics Comparison',
      subtitle: 'Silhouette Score · Davies-Bouldin Index · Cluster Distribution',
      loading: 'Computing...',
      labels: {
        silhouette: 'Silhouette Score ↑',
        db: 'Davies-Bouldin ↓',
        clusters: 'Clusters',
        customers: 'Customers',
      },
    },
    buttons: {
      withLibrary: '🔬 With Library (sklearn)',
      noLibrary: '⚙️ No Library (scratch)',
    },
    labels: {
      silhouette: 'Silhouette',
      dbIndex: 'Davies-Bouldin',
      clusters: 'Clusters',
      rows: 'Rows',
      loading: 'Loading...',
      graphNotFound: '📂 No charts found',
      metricsUnavailable: 'Metrics: no cluster labels in the CSV yet',
      errorGraphs: '⚠️ Failed to load charts',
    },
    conclusion: {
      title: 'Conclusion',
      subtitle: 'Summary of segmentation results and key considerations',
      resultsTitle: 'Key outcomes',
      results: [
        'Demographic: 3 clusters by age, income, and dependency ratio that reflect life stages.',
        'RFM: 2 clear value clusters with the highest Silhouette (~0.4394), enabling retention strategies.',
        'Product+Channel: 4 behavior clusters (Wine Enthusiasts, Balanced Buyers, Premium Product Seekers, Online Engagers).',
      ],
      limitationsTitle: 'Limitations & cautions',
      limitations: [
        'Silhouette scores range 0.28–0.44, indicating moderate separation.',
        'Some customers sit near cluster boundaries (negative Silhouette).',
        'Elbow and Silhouette may disagree; business context is required.',
        'Customer data is multi-dimensional with natural outliers.',
      ],
      summary:
        'Overall, the clusters are business-meaningful and help shape targeted marketing and customer care.',
    },
    toggles: {
      themeLabel: 'Theme',
      light: 'Light',
      dark: 'Dark',
      languageLabel: 'Language',
    },
  },
} as const

type GraphGroup =
  | 'processing_analysis'
  | 'processing_cleaning'
  | 'feature_rfm'
  | 'training_demographic'
  | 'training_productchannel'
  | 'training_rfm'

const noteText = {
  vi: {
    preprocessMissing:
      'Income chỉ thiếu 24 giá trị (~0.04%) nên loại bỏ các dòng thiếu để tránh sai lệch do ước lượng.',
    preprocessDuplicates:
      'Không có trùng lặp toàn dòng/ID nhưng có 182 dòng trùng đặc trưng; loại bỏ để giảm bias và tăng tính đại diện.',
    preprocessOutlierSelective:
      'Outliers xử lý có chọn lọc: loại bỏ giá trị cực đoan (Income ≥ 500K, Year_Birth < 1900) và giữ outliers hợp lệ phản ánh VIP/frequent buyers.',
    preprocessOutlierCount:
      'Outliers ở biến đếm phản ánh hành vi mua sắm đặc biệt; phần lớn được giữ để bảo toàn insight.',
    preprocessOutlierSpending:
      'Outliers chi tiêu phản ánh khách hàng giá trị cao; giữ lại để phân biệt phân khúc high-spender.',
    preprocessOutlierIncome:
      'Giá trị Income cực đoan (≥ 500K) được loại bỏ vì nghi ngờ lỗi nhập liệu.',
    preprocessOutlierYearBirth:
      'Năm sinh < 1900 bị loại bỏ vì không thực tế.',
    preprocessConstant:
      'Biến hằng không mang thông tin phân biệt; chỉ ghi nhận và cân nhắc loại bỏ khỏi mô hình.',
    preprocessDistribution:
      'Phân phối tổng quan giúp phát hiện lệch và xác định biến cần xử lý trước khi phân cụm.',
    preprocessCorrelation:
      'Ma trận tương quan dùng để đánh giá mối liên hệ giữa biến và hạn chế multicollinearity.',
    rfmRecency:
      'Recency 0–100 ngày, gần như độc lập; giá trị cao = khách hàng ít hoạt động gần đây.',
    rfmIncomePerFamily:
      'Thu nhập bình quân đầu người (Box-Cox) giảm skew 1.003 → -0.006, phản ánh khả năng tài chính.',
    rfmIncomeTransform:
      'Biến đổi giúp giảm lệch mạnh và tăng ổn định trước khi áp dụng K-Means.',
    rfmPc1Total:
      'PC1_TotalPurchases_Total tổng hợp TotalPurchases và Total_Spent, giữ 87.81% phương sai.',
    rfmPc1Avg:
      'PC1_AvgPerPurchase_Income tổng hợp AOV và Income, giữ 89.73% phương sai, đo sức mua.',
    rfmCorrelation:
      'Recency gần độc lập; các PC có tương quan tự nhiên do bản chất RFM.',
    noteOptimalKDemographic:
      'Elbow gợi ý K=4, Silhouette gợi ý K=3; K=3 cân bằng tốt giữa phân tách và triển khai.',
    noteOptimalKProduct:
      'Elbow và Silhouette cùng chọn K=4 cho Product+Channel.',
    noteOptimalKRfm:
      'Elbow gợi ý K=5, Silhouette gợi ý K=2; K=2 dễ triển khai, K=5 chi tiết hơn.',
    notePcaProjection:
      'Chiếu PCA 2D/3D giúp quan sát mức độ tách cụm theo không gian giảm chiều.',
    noteCluster2D:
      'Biểu đồ phân cụm 2D minh họa sự tách biệt giữa các nhóm khách hàng.',
    noteCluster3D:
      'Phân cụm 3D giúp nhìn rõ khoảng cách giữa các nhóm.',
    noteDemographicEducation:
      'Phân phối Education hỗ trợ diễn giải khác biệt trình độ giữa các cụm.',
    noteDemographicLifeStage:
      'Life_Stage cho thấy cấu trúc vòng đời trong từng cụm nhân khẩu học.',
    noteDemographicLine:
      'K=3 tạo 3 nhóm: High-Income Singles/Couples, Mature Empty Nesters, Young Families with Dependents.',
    noteProductPreferences:
      'Biểu đồ sở thích sản phẩm thể hiện mức quan tâm Wine/Meat/Gold... theo từng cụm.',
    noteProductDominant:
      'Dominant Product giúp nhận diện cụm tập trung vào một loại sản phẩm.',
    noteProductTopShare:
      'Top product share thấp = mua đa dạng; cao = tập trung vào một sản phẩm.',
    noteProductLine:
      'K=4 tạo 4 nhóm: Premium Product Seekers, Balanced Buyers, Online Engagers, Wine Enthusiasts.',
    noteRfmLine:
      'K=2 phân tách At-Risk High-Value và Emerging Potential; K=5 có thể dùng để phân khúc sâu.',
  },
  en: {
    preprocessMissing:
      'Only Income had 24 missing values (~0.04%), so rows were removed to avoid imputation bias.',
    preprocessDuplicates:
      'No full-row/ID duplicates, but 182 feature-level duplicates were removed to reduce bias.',
    preprocessOutlierSelective:
      'Outliers were handled selectively: extreme values (Income ≥ 500K, Year_Birth < 1900) removed, valid VIP/frequent outliers kept.',
    preprocessOutlierCount:
      'Count outliers reflect special shopping behavior and were mostly kept to preserve insights.',
    preprocessOutlierSpending:
      'Spending outliers represent high-value customers and were kept for segmentation clarity.',
    preprocessOutlierIncome:
      'Extreme Income values (≥ 500K) were removed due to likely data entry issues.',
    preprocessOutlierYearBirth:
      'Year_Birth values < 1900 were removed as unrealistic.',
    preprocessConstant:
      'Constant variables carry no discriminatory signal and are flagged for removal.',
    preprocessDistribution:
      'Distribution checks help detect skew and guide preprocessing decisions.',
    preprocessCorrelation:
      'Correlation analysis helps evaluate variable relationships and avoid multicollinearity.',
    rfmRecency:
      'Recency spans 0–100 days and is nearly independent; higher values indicate inactivity.',
    rfmIncomePerFamily:
      'Income per family member (Box-Cox) reduces skew from 1.003 → -0.006, reflecting financial capacity.',
    rfmIncomeTransform:
      'Transformations reduce skew and stabilize features before K-Means.',
    rfmPc1Total:
      'PC1_TotalPurchases_Total combines TotalPurchases and Total_Spent, preserving 87.81% variance.',
    rfmPc1Avg:
      'PC1_AvgPerPurchase_Income combines AOV and Income, preserving 89.73% variance to measure buying power.',
    rfmCorrelation:
      'Recency stays independent; PCs correlate naturally due to RFM structure.',
    noteOptimalKDemographic:
      'Elbow suggests K=4 while Silhouette suggests K=3; K=3 balances separation and execution.',
    noteOptimalKProduct:
      'Elbow and Silhouette agree on K=4 for Product+Channel.',
    noteOptimalKRfm:
      'Elbow suggests K=5 while Silhouette suggests K=2; K=2 is simpler, K=5 is more detailed.',
    notePcaProjection:
      'PCA 2D/3D projections help visualize cluster separation in reduced space.',
    noteCluster2D:
      '2D cluster plots illustrate the separation between customer groups.',
    noteCluster3D:
      '3D clustering highlights distances between groups more clearly.',
    noteDemographicEducation:
      'Education distribution helps interpret differences in cluster profiles.',
    noteDemographicLifeStage:
      'Life-stage distribution reveals the household structure of each cluster.',
    noteDemographicLine:
      'K=3 yields: High-Income Singles/Couples, Mature Empty Nesters, and Young Families with Dependents.',
    noteProductPreferences:
      'Product preferences show interest in Wine/Meat/Gold by cluster.',
    noteProductDominant:
      'Dominant product highlights clusters that focus on a single product type.',
    noteProductTopShare:
      'Lower top-share means diverse buying; higher share means concentrated demand.',
    noteProductLine:
      'K=4 yields: Premium Product Seekers, Balanced Buyers, Online Engagers, and Wine Enthusiasts.',
    noteRfmLine:
      'K=2 separates At-Risk High-Value vs Emerging Potential; K=5 provides deeper segmentation.',
  },
} as const

type NoteKey = keyof typeof noteText.vi

const noteRules: Record<GraphGroup, Array<{ test: RegExp; key: NoteKey }>> = {
  processing_analysis: [
    { test: /missing_values/i, key: 'preprocessMissing' },
    { test: /duplicate/i, key: 'preprocessDuplicates' },
    { test: /special_outliers_Year_Birth|outlier.*Year_Birth/i, key: 'preprocessOutlierYearBirth' },
    { test: /income_outliers_Income|outlier.*Income/i, key: 'preprocessOutlierIncome' },
    { test: /spending_outliers/i, key: 'preprocessOutlierSpending' },
    { test: /count_outliers/i, key: 'preprocessOutlierCount' },
    { test: /binary_outliers/i, key: 'preprocessOutlierCount' },
    { test: /constant_variable/i, key: 'preprocessConstant' },
    { test: /correlation/i, key: 'preprocessCorrelation' },
    { test: /distribution/i, key: 'preprocessDistribution' },
  ],
  processing_cleaning: [
    { test: /missing_values/i, key: 'preprocessMissing' },
    { test: /duplicate/i, key: 'preprocessDuplicates' },
    { test: /outlier.*Income/i, key: 'preprocessOutlierIncome' },
    { test: /outlier.*Year_Birth/i, key: 'preprocessOutlierYearBirth' },
    { test: /outlier/i, key: 'preprocessOutlierSelective' },
  ],
  feature_rfm: [
    { test: /Recency_(histogram|boxplot)/i, key: 'rfmRecency' },
    {
      test: /Income_per_Family_Member_Transformed_(histogram|boxplot)/i,
      key: 'rfmIncomePerFamily',
    },
    { test: /Income_per_Family_Member_before_after/i, key: 'rfmIncomeTransform' },
    { test: /PC1_TotalPurchases_Total_(histogram|boxplot)/i, key: 'rfmPc1Total' },
    { test: /PC1_AvgPerPurchase_Income_(histogram|boxplot)/i, key: 'rfmPc1Avg' },
    { test: /correlation_heatmap/i, key: 'rfmCorrelation' },
  ],
  training_demographic: [
    { test: /Optimal_K_Evaluation/i, key: 'noteOptimalKDemographic' },
    { test: /PCA_2D|PCA_3D/i, key: 'notePcaProjection' },
    { test: /Clusters_2D/i, key: 'noteCluster2D' },
    { test: /Clusters_3D/i, key: 'noteCluster3D' },
    { test: /PostHoc_Education/i, key: 'noteDemographicEducation' },
    { test: /PostHoc_LifeStage/i, key: 'noteDemographicLifeStage' },
    { test: /Cluster_Characteristics_Line/i, key: 'noteDemographicLine' },
  ],
  training_productchannel: [
    { test: /Optimal_K_Evaluation/i, key: 'noteOptimalKProduct' },
    { test: /PCA_2D|PCA_3D/i, key: 'notePcaProjection' },
    { test: /Clusters_2D/i, key: 'noteCluster2D' },
    { test: /Clusters_3D/i, key: 'noteCluster3D' },
    { test: /PostHoc_Preferences/i, key: 'noteProductPreferences' },
    { test: /PostHoc_DominantProduct/i, key: 'noteProductDominant' },
    { test: /PostHoc_TopProductShare/i, key: 'noteProductTopShare' },
    { test: /Cluster_Characteristics_Line/i, key: 'noteProductLine' },
  ],
  training_rfm: [
    { test: /Optimal_K_Evaluation/i, key: 'noteOptimalKRfm' },
    { test: /PCA_2D|PCA_3D/i, key: 'notePcaProjection' },
    { test: /Clusters_2D/i, key: 'noteCluster2D' },
    { test: /Clusters_3D/i, key: 'noteCluster3D' },
    { test: /Cluster_Characteristics_Line/i, key: 'noteRfmLine' },
  ],
}

const defaultNoteByGroup: Record<GraphGroup, NoteKey> = {
  processing_analysis: 'preprocessDistribution',
  processing_cleaning: 'preprocessOutlierSelective',
  feature_rfm: 'rfmCorrelation',
  training_demographic: 'noteCluster2D',
  training_productchannel: 'noteCluster2D',
  training_rfm: 'noteCluster2D',
}

function resolveGraphGroup(graphKey: string): GraphGroup {
  if (graphKey === 'processing_analysis') return 'processing_analysis'
  if (graphKey === 'processing_cleaning') return 'processing_cleaning'
  if (graphKey === 'feature_rfm') return 'feature_rfm'
  if (graphKey.startsWith('demographic_')) return 'training_demographic'
  if (graphKey.startsWith('productchannel_')) return 'training_productchannel'
  return 'training_rfm'
}

function getChartNote(lang: Language, graphKey: string, filename: string) {
  const group = resolveGraphGroup(graphKey)
  const rules = noteRules[group] ?? []
  const matched = rules.find((rule) => rule.test.test(filename))
  const key = matched?.key ?? defaultNoteByGroup[group]
  return noteText[lang][key]
}

const segmentMeta = {
  rfm: { badge: 'rfm', icon: '◉' },
  demographic: { badge: 'demo', icon: '◉' },
  productchannel: { badge: 'pc', icon: '◉' },
} as const

const procMap: Record<ProcessingKey, string> = {
  analysis: 'processing_analysis',
  cleaning: 'processing_cleaning',
  feature: 'feature_rfm',
}

const themeStorageKey = 'kmeans-theme'
const langStorageKey = 'kmeans-lang'

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path))
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

function formatGraphName(filename: string) {
  return filename.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/^\d+_/, '')
}

function useCountUp(target: number | null | undefined) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target === null || target === undefined) {
      setValue(0)
      return
    }

    const duration = 800
    const start = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setValue(Math.floor(progress * target))
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [target])

  return value
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>{text}</p>
    </div>
  )
}

function App() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'vi'
    const stored = window.localStorage.getItem(langStorageKey)
    return stored === 'en' ? 'en' : 'vi'
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = window.localStorage.getItem(themeStorageKey)
    return stored === 'light' ? 'light' : 'dark'
  })

  const [status, setStatus] = useState<'connecting' | 'online' | 'error' | 'offline'>(
    'connecting',
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [activeVersion, setActiveVersion] = useState<Record<SegmentKey, VersionKey>>({
    rfm: 'library',
    demographic: 'library',
    productchannel: 'library',
  })
  const [activeProcessing, setActiveProcessing] = useState<ProcessingKey>('analysis')

  const [overview, setOverview] = useState<LoadState<OverviewData>>({
    status: 'idle',
  })
  const [quickMetrics, setQuickMetrics] = useState<Record<SegmentKey, MetricsData | null>>({
    rfm: null,
    demographic: null,
    productchannel: null,
  })
  const [clusterState, setClusterState] = useState<
    Record<string, LoadState<{ graphKey: string; graphs: string[]; metrics?: MetricsData }>>
  >({})
  const [processingState, setProcessingState] = useState<
    Record<ProcessingKey, LoadState<GraphListData>>
  >({
    analysis: { status: 'idle' },
    cleaning: { status: 'idle' },
    feature: { status: 'idle' },
  })
  const [datasetState, setDatasetState] = useState<LoadState<DatasetSampleData>>({
    status: 'idle',
  })
  const [summaryState, setSummaryState] = useState<LoadState<SummaryData>>({
    status: 'idle',
  })
  const [lightbox, setLightbox] = useState<{
    open: boolean
    index: number
    items: GalleryItem[]
  }>({ open: false, index: 0, items: [] })

  const c = copy[lang]
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US'),
    [lang],
  )

  const customersCount = useCountUp(overview.data?.total_customers)
  const featuresCount = useCountUp(overview.data?.total_features)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.dataset.theme = theme
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = lang
    window.localStorage.setItem(langStorageKey, lang)
  }, [lang])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const tabLabel = getTabLabel(activeTab, c)
    document.title = `${c.appName} · ${tabLabel}`
  }, [activeTab, c.appName, lang])

  useEffect(() => {
    const init = async () => {
      setOverview({ status: 'loading' })
      try {
        const response = await fetch(apiUrl('/api/overview'))
        if (!response.ok) {
          setStatus('error')
          setOverview({ status: 'error', error: `HTTP ${response.status}` })
          return
        }
        const data = (await response.json()) as OverviewData
        setStatus('online')
        setOverview({ status: 'ready', data })
      } catch (error) {
        setStatus('offline')
        setOverview({ status: 'error', error: (error as Error).message })
      }
    }

    void init()
  }, [])

  useEffect(() => {
    const segments: SegmentKey[] = ['rfm', 'demographic', 'productchannel']
    let cancelled = false

    segments.forEach(async (seg) => {
      try {
        const data = await apiFetch<MetricsData>(`/api/metrics/${seg}`)
        if (!cancelled) {
          setQuickMetrics((prev) => ({ ...prev, [seg]: data }))
        }
      } catch {
        if (!cancelled) {
          setQuickMetrics((prev) => ({ ...prev, [seg]: null }))
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const segmentTabs: SegmentKey[] = ['rfm', 'demographic', 'productchannel']
    if (segmentTabs.includes(activeTab as SegmentKey)) {
      void ensureClusterLoaded(activeTab as SegmentKey, activeVersion[activeTab as SegmentKey])
    }
    if (activeTab === 'processing') {
      void ensureProcessingLoaded(activeProcessing)
    }
    if (activeTab === 'dataset' && datasetState.status === 'idle') {
      void loadDataset()
    }
    if (activeTab === 'metrics' && summaryState.status === 'idle') {
      void loadSummary()
    }
  }, [activeTab, activeVersion, activeProcessing, datasetState.status, summaryState.status])

  useEffect(() => {
    if (!lightbox.open) return
    document.body.style.overflow = 'hidden'

    const handleKey = (event: KeyboardEvent) => {
      if (!lightbox.open) return
      if (event.key === 'Escape') {
        closeLightbox()
      }
      if (event.key === 'ArrowLeft') {
        lightboxNav(-1)
      }
      if (event.key === 'ArrowRight') {
        lightboxNav(1)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [lightbox.open, lightbox.index, lightbox.items])

  const statusText =
    status === 'online'
      ? c.status.online
      : status === 'error'
        ? c.status.error
        : status === 'offline'
          ? c.status.offline
          : c.status.connecting

  const statusClass = status === 'online' ? 'online' : status === 'error' ? 'error' : ''

  const overviewCustomers =
    overview.status === 'ready' ? numberFormat.format(customersCount) : '—'
  const overviewFeatures =
    overview.status === 'ready' ? numberFormat.format(featuresCount) : '—'

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    if (window.innerWidth < 900) {
      setSidebarOpen(false)
    }
  }

  const openLightbox = (items: GalleryItem[], index: number) => {
    setLightbox({ open: true, index, items })
  }

  const closeLightbox = () => {
    setLightbox((prev) => ({ ...prev, open: false }))
  }

  const lightboxNav = (dir: number) => {
    setLightbox((prev) => {
      if (!prev.items.length) return prev
      const nextIndex = (prev.index + dir + prev.items.length) % prev.items.length
      return { ...prev, index: nextIndex }
    })
  }

  const currentLightbox = lightbox.items[lightbox.index]

  async function ensureClusterLoaded(segment: SegmentKey, version: VersionKey) {
    const key = `${segment}-${version}`
    const existing = clusterState[key]
    if (existing?.status === 'loading' || existing?.status === 'ready') return

    setClusterState((prev) => ({
      ...prev,
      [key]: { status: 'loading' },
    }))

    const graphKey = `${segment}_${version}`
    try {
      const [graphsData, metricsData] = await Promise.all([
        apiFetch<GraphListData>(`/api/graphs/${graphKey}`),
        apiFetch<MetricsData>(`/api/metrics/${segment}`).catch(() => undefined),
      ])

      setClusterState((prev) => ({
        ...prev,
        [key]: {
          status: 'ready',
          data: {
            graphKey,
            graphs: graphsData.files || [],
            metrics: metricsData,
          },
        },
      }))
    } catch (error) {
      setClusterState((prev) => ({
        ...prev,
        [key]: {
          status: 'error',
          error: (error as Error).message,
        },
      }))
    }
  }

  async function ensureProcessingLoaded(tab: ProcessingKey) {
    const state = processingState[tab]
    if (state?.status === 'loading' || state?.status === 'ready') return

    setProcessingState((prev) => ({
      ...prev,
      [tab]: { status: 'loading' },
    }))

    const graphKey = procMap[tab]
    try {
      const data = await apiFetch<GraphListData>(`/api/graphs/${graphKey}`)
      setProcessingState((prev) => ({
        ...prev,
        [tab]: { status: 'ready', data },
      }))
    } catch (error) {
      setProcessingState((prev) => ({
        ...prev,
        [tab]: { status: 'error', error: (error as Error).message },
      }))
    }
  }

  async function loadDataset() {
    setDatasetState({ status: 'loading' })
    try {
      const data = await apiFetch<DatasetSampleData>('/api/dataset/sample')
      setDatasetState({ status: 'ready', data })
    } catch (error) {
      setDatasetState({ status: 'error', error: (error as Error).message })
    }
  }

  async function loadSummary() {
    setSummaryState({ status: 'loading' })
    try {
      const data = await apiFetch<SummaryData>('/api/summary')
      setSummaryState({ status: 'ready', data })
    } catch (error) {
      setSummaryState({ status: 'error', error: (error as Error).message })
    }
  }

  const segmentQuickMetric = (segment: SegmentKey) => {
    const metric = quickMetrics[segment]
    if (!metric) return c.labels.loading
    if (metric.silhouette_score === undefined || metric.davies_bouldin_index === undefined) {
      return c.labels.metricsUnavailable
    }
    return `${c.labels.silhouette}: ${metric.silhouette_score.toFixed(4)}  |  ${c.labels.dbIndex}: ${metric.davies_bouldin_index.toFixed(4)}  |  ${c.labels.clusters}: ${metric.n_clusters ?? '—'}`
  }

  const buildGalleryItems = (graphKey: string, files: string[]) =>
    files.map((file) => ({
      url: apiUrl(`/api/graph/${graphKey}/${file}`),
      name: file,
    }))

  const renderGallery = (
    graphKey: string,
    files: string[],
    emptyMessage: string,
  ) => {
    if (!files.length) {
      return <div className="loading-state">{emptyMessage}</div>
    }

    const items = buildGalleryItems(graphKey, files)
    return (
      <>
        {items.map((item, index) => {
          const note = getChartNote(lang, graphKey, item.name)
          return (
            <div
              className="gallery-card"
              key={`${item.name}-${index}`}
              onClick={() => openLightbox(items, index)}
            >
              <img
                src={item.url}
                alt={item.name}
                loading="lazy"
                onError={(event) => {
                  const card = event.currentTarget.closest('.gallery-card')
                  if (card) card.classList.add('is-hidden')
                }}
              />
              <div className="gallery-card-overlay">
                <span className="overlay-icon">🔍</span>
              </div>
              <div className="gallery-card-footer">
                <span className="graph-name">{formatGraphName(item.name)}</span>
                <span className="gallery-zoom">⤢</span>
              </div>
              <div className="chart-note">{note}</div>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-text">
            {c.appShort}{' '}
            <span className="brand-accent">{c.appAccent}</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <span className="nav-icon">◈</span> {c.nav.overview}
          </button>
          <div className="nav-group-label">{c.nav.segments}</div>
          <button
            type="button"
            className={`nav-item ${activeTab === 'rfm' ? 'active' : ''}`}
            onClick={() => handleTabChange('rfm')}
          >
            <span className="nav-icon">◉</span> {c.nav.rfm}
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'demographic' ? 'active' : ''}`}
            onClick={() => handleTabChange('demographic')}
          >
            <span className="nav-icon">◉</span> {c.nav.demographic}
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'productchannel' ? 'active' : ''}`}
            onClick={() => handleTabChange('productchannel')}
          >
            <span className="nav-icon">◉</span> {c.nav.productchannel}
          </button>
          <div className="nav-group-label">{c.nav.processingGroup}</div>
          <button
            type="button"
            className={`nav-item ${activeTab === 'processing' ? 'active' : ''}`}
            onClick={() => handleTabChange('processing')}
          >
            <span className="nav-icon">◎</span> {c.nav.processing}
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'dataset' ? 'active' : ''}`}
            onClick={() => handleTabChange('dataset')}
          >
            <span className="nav-icon">◎</span> {c.nav.dataset}
          </button>
          <div className="nav-group-label">{c.nav.analysisGroup}</div>
          <button
            type="button"
            className={`nav-item ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => handleTabChange('metrics')}
          >
            <span className="nav-icon">◈</span> {c.nav.metrics}
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'conclusion' ? 'active' : ''}`}
            onClick={() => handleTabChange('conclusion')}
          >
            <span className="nav-icon">◆</span> {c.nav.conclusion}
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="footer-tag">{c.footerTag}</span>
        </div>
      </aside>

      <main className="main-content" id="mainContent">
        <header className="topbar">
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="topbar-title">{getTabLabel(activeTab, c)}</div>
          <div className="topbar-status">
            <span className={`status-dot ${statusClass}`}></span>
            <span className="status-text">{statusText}</span>
          </div>
          <div className="topbar-actions">
            <div className="control-group" role="group" aria-label={c.toggles.themeLabel}>
              <button
                type="button"
                className={`toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <span className="toggle-icon">☀️</span>
                <span className="toggle-label">{c.toggles.light}</span>
              </button>
              <button
                type="button"
                className={`toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <span className="toggle-icon">🌙</span>
                <span className="toggle-label">{c.toggles.dark}</span>
              </button>
            </div>
            <div
              className="control-group"
              role="group"
              aria-label={c.toggles.languageLabel}
            >
              <button
                type="button"
                className={`toggle-btn ${lang === 'vi' ? 'active' : ''}`}
                onClick={() => setLang('vi')}
                aria-pressed={lang === 'vi'}
              >
                VI
              </button>
              <button
                type="button"
                className={`toggle-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        <section className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">{c.overview.title}</h1>
            <p className="page-subtitle">{c.overview.subtitle}</p>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card" id="kpi-customers">
              <div className="kpi-icon">👥</div>
              <div className="kpi-value counter">{overviewCustomers}</div>
              <div className="kpi-label">{c.kpi.customers}</div>
            </div>
            <div className="kpi-card" id="kpi-features">
              <div className="kpi-icon">📊</div>
              <div className="kpi-value counter">{overviewFeatures}</div>
              <div className="kpi-label">{c.kpi.features}</div>
            </div>
            <div className="kpi-card" id="kpi-segments">
              <div className="kpi-icon">🔷</div>
              <div className="kpi-value">3</div>
              <div className="kpi-label">{c.kpi.segments}</div>
            </div>
            <div className="kpi-card" id="kpi-implementations">
              <div className="kpi-icon">⚙️</div>
              <div className="kpi-value">2</div>
              <div className="kpi-label">{c.kpi.implementations}</div>
            </div>
          </div>

          <div className="section-title">{c.overview.pipelineTitle}</div>
          <div className="pipeline-grid">
            {c.pipelineSteps.flatMap((step, index) => {
              const items = [
                <div className="pipeline-step" key={`step-${step.title}`}>
                  <div className="step-num">{String(index + 1).padStart(2, '0')}</div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.desc}</div>
                </div>,
              ]

              if (index < c.pipelineSteps.length - 1) {
                items.push(
                  <div className="pipeline-arrow" key={`arrow-${step.title}`}>
                    →
                  </div>,
                )
              }

              return items
            })}
          </div>

          <div className="section-title">{c.overview.segmentsTitle}</div>
          <div className="segments-overview">
            <div className="seg-card" onClick={() => handleTabChange('rfm')}>
              <div className="seg-header">
                <span className="seg-badge rfm">{c.nav.rfm}</span>
                <span className="seg-arrow">→</span>
              </div>
              <div className="seg-title">{c.segmentCards.rfm.title}</div>
              <div className="seg-desc">{c.segmentCards.rfm.desc}</div>
              <div className="seg-metric">{segmentQuickMetric('rfm')}</div>
            </div>
            <div className="seg-card" onClick={() => handleTabChange('demographic')}>
              <div className="seg-header">
                <span className="seg-badge demo">{c.nav.demographic}</span>
                <span className="seg-arrow">→</span>
              </div>
              <div className="seg-title">{c.segmentCards.demographic.title}</div>
              <div className="seg-desc">{c.segmentCards.demographic.desc}</div>
              <div className="seg-metric">{segmentQuickMetric('demographic')}</div>
            </div>
            <div className="seg-card" onClick={() => handleTabChange('productchannel')}>
              <div className="seg-header">
                <span className="seg-badge pc">{c.nav.productchannel}</span>
                <span className="seg-arrow">→</span>
              </div>
              <div className="seg-title">{c.segmentCards.productchannel.title}</div>
              <div className="seg-desc">{c.segmentCards.productchannel.desc}</div>
              <div className="seg-metric">{segmentQuickMetric('productchannel')}</div>
            </div>
          </div>

          <div className="section-title">{c.meaning.title}</div>
          <div className="meaning-grid">
            {c.meaning.items.map((item) => (
              <div className="meaning-card" key={item.title}>
                <div className="meaning-title">{item.title}</div>
                <div className="meaning-question">{item.question}</div>
                <div className="meaning-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {(['rfm', 'demographic', 'productchannel'] as SegmentKey[]).map((segment) => {
          const version = activeVersion[segment]
          const clusterKey = `${segment}-${version}`
          const state = clusterState[clusterKey]
          const metrics = state?.data?.metrics

          return (
            <section
              className={`tab-content ${activeTab === segment ? 'active' : ''}`}
              key={segment}
            >
              <div className="page-header">
                <h1 className="page-title">{c.tabs[segment].title}</h1>
                <p className="page-subtitle">{c.tabs[segment].subtitle}</p>
              </div>
              <div className="impl-toggle-bar">
                <button
                  className={`impl-btn ${version === 'library' ? 'active' : ''}`}
                  type="button"
                  onClick={() =>
                    setActiveVersion((prev) => ({ ...prev, [segment]: 'library' }))
                  }
                >
                  {c.buttons.withLibrary}
                </button>
                <button
                  className={`impl-btn ${version === 'nolibrary' ? 'active' : ''}`}
                  type="button"
                  onClick={() =>
                    setActiveVersion((prev) => ({ ...prev, [segment]: 'nolibrary' }))
                  }
                >
                  {c.buttons.noLibrary}
                </button>
              </div>
              <div className="metrics-bar">
                {metrics?.silhouette_score !== undefined &&
                  metrics?.davies_bouldin_index !== undefined && (
                    <>
                      <div className="metric-pill">
                        <span className="label">{c.labels.silhouette}</span>
                        <span className="value">{metrics.silhouette_score.toFixed(4)}</span>
                      </div>
                      <div className="metric-pill">
                        <span className="label">{c.labels.dbIndex}</span>
                        <span className="value">{metrics.davies_bouldin_index.toFixed(4)}</span>
                      </div>
                      <div className="metric-pill">
                        <span className="label">{c.labels.clusters}</span>
                        <span className="value">{metrics.n_clusters ?? '—'}</span>
                      </div>
                      <div className="metric-pill">
                        <span className="label">{c.labels.rows}</span>
                        <span className="value">
                          {metrics.n_rows ? numberFormat.format(metrics.n_rows) : '—'}
                        </span>
                      </div>
                    </>
                  )}
              </div>
              <div className="gallery-grid">
                {state?.status === 'loading' && <LoadingState text={c.labels.loading} />}
                {state?.status === 'error' && (
                  <div className="loading-state">{`${c.labels.errorGraphs}: ${state.error}`}</div>
                )}
                {state?.status === 'ready' &&
                  state.data &&
                  renderGallery(state.data.graphKey, state.data.graphs, c.labels.graphNotFound)}
                {!state && <LoadingState text={c.labels.loading} />}
              </div>
            </section>
          )
        })}

        <section className={`tab-content ${activeTab === 'processing' ? 'active' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">{c.processing.title}</h1>
            <p className="page-subtitle">{c.processing.subtitle}</p>
          </div>
          <div className="impl-toggle-bar">
            <button
              className={`impl-btn ${activeProcessing === 'analysis' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveProcessing('analysis')}
            >
              📊 {c.processing.analysis}
            </button>
            <button
              className={`impl-btn ${activeProcessing === 'cleaning' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveProcessing('cleaning')}
            >
              🧹 {c.processing.cleaning}
            </button>
            <button
              className={`impl-btn ${activeProcessing === 'feature' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveProcessing('feature')}
            >
              🔧 {c.processing.feature}
            </button>
          </div>
          <div className="gallery-grid">
            {processingState[activeProcessing]?.status === 'loading' && (
              <LoadingState text={c.labels.loading} />
            )}
            {processingState[activeProcessing]?.status === 'error' && (
              <div className="loading-state">
                {`${c.labels.errorGraphs}: ${processingState[activeProcessing]?.error}`}
              </div>
            )}
            {processingState[activeProcessing]?.status === 'ready' &&
              processingState[activeProcessing]?.data &&
              renderGallery(
                procMap[activeProcessing],
                processingState[activeProcessing]?.data?.files || [],
                c.labels.graphNotFound,
              )}
            {processingState[activeProcessing]?.status === 'idle' && (
              <LoadingState text={c.labels.loading} />
            )}
          </div>
        </section>

        <section className={`tab-content ${activeTab === 'dataset' ? 'active' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">{c.dataset.title}</h1>
            <p className="page-subtitle">{c.dataset.subtitle}</p>
          </div>
          <div className="table-wrapper">
            {datasetState.status === 'loading' && <LoadingState text={c.dataset.loading} />}
            {datasetState.status === 'error' && (
              <div className="loading-state">⚠️ {datasetState.error}</div>
            )}
            {datasetState.status === 'ready' && datasetState.data && (
              <table className="data-table">
                <thead>
                  <tr>
                    {datasetState.data.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datasetState.data.rows.map((row, rowIdx) => (
                    <tr key={`row-${rowIdx}`}>
                      {row.map((cell, cellIdx) => (
                        <td key={`cell-${rowIdx}-${cellIdx}`}>
                          {cell !== null && cell !== '' ? cell : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className={`tab-content ${activeTab === 'metrics' ? 'active' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">{c.metrics.title}</h1>
            <p className="page-subtitle">{c.metrics.subtitle}</p>
          </div>
          <div className="metrics-comparison-grid">
            {summaryState.status === 'loading' && <LoadingState text={c.metrics.loading} />}
            {summaryState.status === 'error' && (
              <div className="loading-state">⚠️ {summaryState.error}</div>
            )}
            {summaryState.status === 'ready' && summaryState.data &&
              (['rfm', 'demographic', 'productchannel'] as SegmentKey[]).map((seg) => {
                const meta = segmentMeta[seg]
                const summary = summaryState.data?.[seg]
                if (!summary || summary.error) {
                  return (
                    <div className="metric-comp-card" key={seg}>
                      <div className="mcc-title">
                        {meta.icon} {c.nav[seg]}
                      </div>
                      <p className="mcc-error">⚠️ {summary?.error ?? '—'}</p>
                    </div>
                  )
                }

                const silColor =
                  summary.silhouette_score && summary.silhouette_score > 0.5
                    ? 'val-good'
                    : summary.silhouette_score && summary.silhouette_score > 0.25
                      ? 'val-moderate'
                      : 'val-info'
                const dbColor =
                  summary.davies_bouldin_index && summary.davies_bouldin_index < 1
                    ? 'val-good'
                    : summary.davies_bouldin_index && summary.davies_bouldin_index < 2
                      ? 'val-moderate'
                      : 'val-info'

                return (
                  <div className="metric-comp-card" key={seg}>
                    <div className="mcc-title">
                      {meta.icon} {c.nav[seg]}
                      <span className={`seg-badge ${meta.badge} mcc-badge`}>
                        {c.nav[seg].toUpperCase()}
                      </span>
                    </div>
                    <div className="mcc-metric-row">
                      <span className="mcc-metric-name">{c.metrics.labels.silhouette}</span>
                      <span className={`mcc-metric-val ${silColor}`}>
                        {(summary.silhouette_score ?? 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="mcc-metric-row">
                      <span className="mcc-metric-name">{c.metrics.labels.db}</span>
                      <span className={`mcc-metric-val ${dbColor}`}>
                        {(summary.davies_bouldin_index ?? 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="mcc-metric-row">
                      <span className="mcc-metric-name">{c.metrics.labels.clusters}</span>
                      <span className="mcc-metric-val val-info">
                        {summary.n_clusters ?? '—'}
                      </span>
                    </div>
                    <div className="mcc-metric-row">
                      <span className="mcc-metric-name">{c.metrics.labels.customers}</span>
                      <span className="mcc-metric-val">
                        {summary.n_rows ? numberFormat.format(summary.n_rows) : '—'}
                      </span>
                    </div>
                    {summary.cluster_distribution && (
                      <div className="cluster-dist">
                        {Object.entries(summary.cluster_distribution).map(([key, value]) => (
                          <span className="dist-pill" key={`${seg}-${key}`}>
                            C{key}: {numberFormat.format(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </section>

        <section className={`tab-content ${activeTab === 'conclusion' ? 'active' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">{c.conclusion.title}</h1>
            <p className="page-subtitle">{c.conclusion.subtitle}</p>
          </div>
          <div className="conclusion-grid">
            <div className="conclusion-card">
              <div className="conclusion-title">{c.conclusion.resultsTitle}</div>
              <ul className="conclusion-list">
                {c.conclusion.results.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="conclusion-card">
              <div className="conclusion-title">{c.conclusion.limitationsTitle}</div>
              <ul className="conclusion-list">
                {c.conclusion.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="conclusion-summary">{c.conclusion.summary}</div>
        </section>
      </main>

      <div
        className={`lightbox ${lightbox.open ? 'open' : ''}`}
        onClick={closeLightbox}
      >
        <button className="lightbox-close" type="button" onClick={closeLightbox}>
          ✕
        </button>
        <button
          className="lightbox-prev"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            lightboxNav(-1)
          }}
          style={{ display: lightbox.items.length > 1 ? 'flex' : 'none' }}
        >
          ‹
        </button>
        <button
          className="lightbox-next"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            lightboxNav(1)
          }}
          style={{ display: lightbox.items.length > 1 ? 'flex' : 'none' }}
        >
          ›
        </button>
        <div
          className="lightbox-inner"
          onClick={(event) => event.stopPropagation()}
        >
          <img
            className="lightbox-img"
            src={currentLightbox?.url ?? ''}
            alt={currentLightbox?.name ?? 'Graph'}
          />
          {currentLightbox && (
            <div className="lightbox-caption">
              {formatGraphName(currentLightbox.name)} ({lightbox.index + 1} /{' '}
              {lightbox.items.length})
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function getTabLabel(tab: TabKey, c: (typeof copy)[Language]) {
  switch (tab) {
    case 'overview':
      return c.nav.overview
    case 'rfm':
      return c.nav.rfm
    case 'demographic':
      return c.nav.demographic
    case 'productchannel':
      return c.nav.productchannel
    case 'processing':
      return c.nav.processing
    case 'dataset':
      return c.nav.dataset
    case 'metrics':
      return c.nav.metrics
    case 'conclusion':
      return c.nav.conclusion
    default:
      return c.nav.overview
  }
}

export default App
