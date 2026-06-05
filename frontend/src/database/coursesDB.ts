import { initDB } from './indexedDB';

export const coursesDB = {
  async cacheCourses(courses: any) {
    const db = await initDB();
    await db.put('courses_cache', { id: 'all_courses', data: courses, timestamp: Date.now() });
  },

  async getCachedCourses() {
    const db = await initDB();
    return db.get('courses_cache', 'all_courses');
  },

  async cacheCourseById(courseId: string, course: any) {
    const db = await initDB();
    await db.put('courses_cache', { id: `course_${courseId}`, data: course, timestamp: Date.now() });
  },

  async getCachedCourseById(courseId: string) {
    const db = await initDB();
    return db.get('courses_cache', `course_${courseId}`);
  },
  
  async clearCoursesCache() {
    const db = await initDB();
    await db.clear('courses_cache');
  }
};
