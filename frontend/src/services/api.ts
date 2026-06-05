import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { siteConfig } from '../config/siteConfig';

// ✅ Generate a unique visitor ID once per browser and store it in localStorage
// This fixes the race condition where multiple parallel API calls each counted as new visitors
export const getVisitorId = (): string => {
  const STORAGE_KEY = 'visitor_id';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    // Generate a UUID v4 using the browser's built-in crypto API
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};

const api = axios.create({
  baseURL: siteConfig.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'X-Visitor-Id': getVisitorId(), // Send visitor ID on every request
  },
  // 🔒 مع withCredentials: true، المتصفح سيرسل الكوكيز (HttpOnly) تلقائياً
  withCredentials: true, 
});

// تعريف أنواع للتحكم في الطلبات المعلقة أثناء التجديد
interface FailedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

interface RefreshRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// متغيرات للتحكم في حالة التجديد (Token Refresh)
let isRefreshing = false;
let failedRequestsQueue: FailedRequest[] = [];

/**
 * دالة معالجة طابور الطلبات
 * وظيفتها: عند الانتهاء من تجديد التوكن، تقوم بتشغيل كافة الطلبات التي تم تعليقها مسبقاً
 */
const processQueue = (error: unknown) => {
  failedRequestsQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedRequestsQueue = [];
};

/**
 * المعترض (Interceptor) للاستجابات
 * وظيفته: فحص جميع الاستجابات القادمة من السيرفر. 
 * إذا انتهت صلاحية التوكن (الرد كان 401)، يقوم تلقائياً بإيقاف الطلب، ومحاولة تجديد التوكن،
 * ثم إعادة إرسال الطلب الأصلي بسلاسة دون أن يلاحظ المستخدم.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    const originalRequest = error.config as RefreshRequestConfig;

    // إذا رجع السيرفر 403 (بسبب تسجيل الدخول من جهاز آخر)، اطرد المستخدم فوراً لصفحة الدخول
    if (error.response?.status === 403 && (error.response?.data as any)?.message?.includes('جهاز آخر')) {
      window.dispatchEvent(new Event('auth-logout'));
      return Promise.reject(error);
    }

    // منع حلقات التكرار اللانهائية لطلبات التوثيق
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 🍪 طلب تحديث التوكنز
        await api.post('/auth/refresh');

        processQueue(null);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError);
        isRefreshing = false;
        
        // إذا فشل الـ Refresh، قم بتسجيل خروج المستخدم
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;