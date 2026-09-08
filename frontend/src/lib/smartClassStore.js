/**
 * Client-side persistence and cache for Smart Class:
 * - Active "Continue Teaching" lesson
 * - Recent lessons history
 * - Favorites / Bookmarked resources & topics
 * - Offline cached items metadata
 */

const STORAGE_KEYS = {
  CONTINUE_TEACHING: 'smartclass_continue_teaching',
  RECENT_LESSONS: 'smartclass_recent_lessons',
  FAVORITES: 'smartclass_favorites',
  OFFLINE_ITEMS: 'smartclass_offline_items',
};

export const smartClassStore = {
  getContinueTeaching() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTINUE_TEACHING);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setContinueTeaching(lesson) {
    try {
      localStorage.setItem(
        STORAGE_KEYS.CONTINUE_TEACHING,
        JSON.stringify({
          ...lesson,
          timestamp: new Date().toISOString(),
        })
      );
      this.addRecentLesson(lesson);
    } catch {
      // ignore
    }
  },

  getRecentLessons() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_LESSONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addRecentLesson(lesson) {
    try {
      const recents = this.getRecentLessons().filter(
        (r) =>
          !(
            r.class_id === lesson.class_id &&
            r.subject_id === lesson.subject_id &&
            r.chapter_id === lesson.chapter_id &&
            r.part_id === lesson.part_id
          )
      );
      recents.unshift({
        ...lesson,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEYS.RECENT_LESSONS, JSON.stringify(recents.slice(0, 15)));
    } catch {
      // ignore
    }
  },

  getFavorites() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  isFavorite(resourceId) {
    const favs = this.getFavorites();
    return favs.some((f) => f.id === resourceId);
  },

  toggleFavorite(resource) {
    try {
      let favs = this.getFavorites();
      const exists = favs.some((f) => f.id === resource.id);
      if (exists) {
        favs = favs.filter((f) => f.id !== resource.id);
      } else {
        favs.unshift({
          ...resource,
          favoritedAt: new Date().toISOString(),
        });
      }
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
      return !exists;
    } catch {
      return false;
    }
  },

  getOfflineItems() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_ITEMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  isOffline(resourceId) {
    const items = this.getOfflineItems();
    return items.some((item) => item.id === resourceId);
  },

  toggleOffline(resource) {
    try {
      let items = this.getOfflineItems();
      const exists = items.some((item) => item.id === resource.id);
      if (exists) {
        items = items.filter((item) => item.id !== resource.id);
      } else {
        items.unshift({
          ...resource,
          savedOfflineAt: new Date().toISOString(),
        });
      }
      localStorage.setItem(STORAGE_KEYS.OFFLINE_ITEMS, JSON.stringify(items));
      return !exists;
    } catch {
      return false;
    }
  },
};
