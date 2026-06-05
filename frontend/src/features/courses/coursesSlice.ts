import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { coursesDB } from '../../database/coursesDB';
import { progressDB } from '../../database/progressDB';

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  videoUrl?: string;
  platformType?: string;
  libraryId?: string;
  duration: number;
  order: number;
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  user: { name: string };
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: string;
  categoryId: string;
  category?: { name: string };
  lessons?: Lesson[];
  reviews?: Review[];
  createdAt?: string;
  _count?: {
    enrollments: number;
    reviews: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { courses: number };
}

interface ProgressRecord {
  lessonId: string;
  completed: boolean;
}

interface CoursesState {
  courses: Course[];
  categories: Category[];
  currentCourse: Course | null;
  loading: boolean;
  error: string | null;
  progress: {
    percentage: number;
    completedCount: number;
    totalCount: number;
    progressList: ProgressRecord[];
  } | null;
}

const initialState: CoursesState = {
  courses: [],
  categories: [],
  currentCourse: null,
  loading: false,
  error: null,
  progress: null,
};

// Thunks
export const fetchCourses = createAsyncThunk(
  'courses/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/courses');
      // ✅ ضمان إن البيانات دايماً array حتى لو الـ API رجّع شكل مختلف
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.courses ?? response.data?.data ?? [];
      await coursesDB.cacheCourses(data);
      return data;
    } catch (error: any) {
      const cached = await coursesDB.getCachedCourses();
      if (cached) return Array.isArray(cached.data) ? cached.data : cached.data?.courses ?? cached.data?.data ?? [];
      return rejectWithValue(error.response?.data?.message || 'خطأ في جلب الدورات التعليمية');
    }
  }
);

export const fetchCourseById = createAsyncThunk(
  'courses/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/courses/${id}`);
      await coursesDB.cacheCourseById(id, response.data);
      return response.data;
    } catch (error: any) {
      const cached = await coursesDB.getCachedCourseById(id);
      if (cached) return cached.data;
      return rejectWithValue(error.response?.data?.message || 'خطأ في جلب بيانات الدورة');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'courses/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/courses/categories');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'خطأ في جلب التصنيفات');
    }
  }
);

export const createCategory = createAsyncThunk(
  'courses/createCategory',
  async (name: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/courses/categories', { name });
      return response.data; // الـ category الجديد يُضاف للـ state مباشرةً
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل إنشاء التصنيف');
    }
  }
);

export const enrollInCourse = createAsyncThunk(
  'courses/enroll',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/courses/enroll', { courseId });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل التسجيل في الدورة');
    }
  }
);

export const toggleLessonProgress = createAsyncThunk(
  'courses/toggleProgress',
  async ({ lessonId, courseId, forceComplete }: { lessonId: string; courseId: string; forceComplete?: boolean }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post('/courses/progress/toggle', { lessonId, forceComplete });
      // Re-fetch progress to update states
      dispatch(fetchCourseProgress(courseId));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل تحديث التقدم');
    }
  }
);

export const fetchCourseProgress = createAsyncThunk(
  'courses/fetchProgress',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/courses/progress/${courseId}`);
      await progressDB.cacheProgress(courseId, response.data);
      return response.data;
    } catch (error: any) {
      const cached = await progressDB.getCachedProgress(courseId);
      if (cached) return cached.data;
      return rejectWithValue(error.response?.data?.message || 'خطأ في جلب التقدم');
    }
  }
);

export const addReview = createAsyncThunk(
  'courses/addReview',
  async ({ courseId, rating, comment }: { courseId: string; rating: number; comment: string }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post('/courses/reviews', { courseId, rating, comment });
      dispatch(fetchCourseById(courseId));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل إضافة التقييم');
    }
  }
);

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearCurrentCourse(state) {
      state.currentCourse = null;
      state.progress = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Courses
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.loading = false;
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Course By ID
      .addCase(fetchCourseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action: PayloadAction<Course>) => {
        state.loading = false;
        state.currentCourse = action.payload;
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Categories
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.categories = action.payload;
      })
      // Create Category — يُضيف التصنيف الجديد مباشرةً للقائمة بدون Refetch
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.categories.push(action.payload);
      })
      // Fetch Progress
      .addCase(fetchCourseProgress.fulfilled, (state, action: PayloadAction<any>) => {
        state.progress = action.payload;
      });
  }
});

export const { clearCurrentCourse } = coursesSlice.actions;
export default coursesSlice.reducer;
