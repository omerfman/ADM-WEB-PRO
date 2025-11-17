/**
 * Firestore Database Schema Documentation
 * ADM İnşaat Proje Yönetim Sistemi
 */

// ========== COLLECTIONS OVERVIEW ==========

/*
 * Collection: companies
 * Description: İnşaat şirketleri
 * Access: Only superadmin
 */
// Example document:
{
  id: "default-company",
  name: "ADM İnşaat A.Ş.",
  description: "Ana kuruluş",
  email: "info@adm-insaat.com",
  phone: "0212 XXX XXXX",
  address: {
    street: "...",
    city: "İstanbul",
    postal: "..."
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  status: "active" // active, inactive
}

/*
 * Collection: users
 * Description: Sistem kullanıcıları
 * Access: Admins can read users in their company
 */
// Example document:
{
  uid: "firebase-uid",
  email: "user@adm.com",
  displayName: "Kullanıcı Adı",
  role: "operator", // superadmin, admin, operator, finance, viewer
  companyId: "default-company",
  permissions: ["read", "write"], // read, write, delete, manage_users
  phone: "0555 123 4567",
  status: "active", // active, inactive
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLogin: Timestamp
}

/*
 * Collection: projects
 * Description: İnşaat projeleri
 * Access: Users in same company can read
 */
// Example document:
{
  id: "proj-001",
  name: "Yazlık Villa",
  description: "Denize yakın yazlık villa projesi",
  location: "Bodrum, Muğla",
  coordinates: {
    latitude: 37.1882,
    longitude: 27.2287
  },
  companyId: "default-company",
  status: "ongoing", // planning, ongoing, completed, paused
  budget: 500000,
  currency: "TRY",
  startDate: Timestamp,
  endDate: Timestamp, // estimated
  createdBy: "user-uid",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  tags: ["residential", "villa"],
  progress: 45 // percentage 0-100
}

/*
 * Subcollection: projects/{projectId}/logs
 * Description: Proje etkinlik logları
 */
// Example document:
{
  id: "log-001",
  type: "milestone", // milestone, note, warning, error
  title: "Temelleme tamamlandı",
  description: "Temel inşaatı başarıyla tamamlandı",
  createdBy: "user-uid",
  createdAt: Timestamp,
  attachments: ["image-url-1", "image-url-2"]
}

/*
 * Subcollection: projects/{projectId}/stocks
 * Description: Proje malzeme stokları
 */
// Example document:
{
  id: "stock-001",
  name: "Çimento",
  category: "construction", // construction, tools, equipment
  quantity: 500,
  unit: "çuval",
  unitPrice: 45.50,
  supplier: "Lafarge Çimento",
  status: "in_stock", // in_stock, ordered, used
  lastUpdated: Timestamp,
  updatedBy: "user-uid"
}

/*
 * Subcollection: projects/{projectId}/payments
 * Description: Proje ödemeleri
 */
// Example document:
{
  id: "pay-001",
  amount: 50000,
  currency: "TRY",
  description: "Birinci taksit ödenmesi",
  status: "paid", // pending, paid, cancelled, overdue
  paymentMethod: "bank_transfer", // bank_transfer, cash, check
  dueDate: Timestamp,
  paidDate: Timestamp,
  paidBy: "user-uid",
  invoiceNumber: "2025-001",
  notes: "Havale yapıldı"
}

/*
 * Subcollection: projects/{projectId}/uploads
 * Description: Proje fotoğraf ve dosyaları (Cloudinary)
 */
// Example document:
{
  id: "upload-001",
  fileName: "project-photo-01.jpg",
  cloudinaryUrl: "https://res.cloudinary.com/...",
  publicId: "adm-construction/projects/proj-001/...",
  size: 2048576, // bytes
  type: "image", // image, video, document
  tags: ["construction-site", "foundation"],
  uploadedAt: Timestamp,
  uploadedBy: "user-uid",
  width: 1920,
  height: 1080
}

/*
 * Collection: audit_logs
 * Description: Sistem audit logları (tüm değişiklikler)
 * Access: Admins can read audit logs for their company
 */
// Example document:
{
  id: "audit-001",
  action: "create", // create, update, delete, login
  entity: "project",
  entityId: "proj-001",
  entityName: "Yazlık Villa",
  companyId: "default-company",
  performedBy: "user-uid",
  performedByName: "Admin User",
  performedByEmail: "admin@adm.com",
  changes: {
    status: { from: "planning", to: "ongoing" },
    progress: { from: 0, to: 45 }
  },
  ipAddress: "192.168.1.1",
  timestamp: Timestamp,
  userAgent: "Mozilla/5.0..."
}

// ========== SECURITY RULES SUMMARY ==========

/*
Roles and Permissions:
- superadmin: Tüm erişim, sistem yönetimi
- admin: Şirket yönetimi, kullanıcı oluşturma, raporlar
- operator: Proje güncellemeleri, log ekleme
- finance: Ödeme yönetimi
- viewer: Sadece okuma erişimi

Access Control:
- Tüm okuma ve yazma işlemleri companyId bazında kontrol edilir
- Role-based access (token.claims.role)
- Document-level security rules

Collections Protected:
- companies: Superadmin only
- users: Admins for their company
- projects: Authenticated users in same company
- audit_logs: Admins for their company, Superadmin for all
*/
