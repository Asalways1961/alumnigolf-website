// Alumni Site Protection - Check Authentication
// Add this script to all public pages (about.html, rules.html, faq.html, etc.)

(function() {
  // List of pages that require authentication
  var protectedPages = ['about.html', 'rules.html', 'faq.html', 'gallery.html', 'contact.html'];
  
  // Get current page filename
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Check if current page needs protection
  var needsAuth = false;
  for (var i = 0; i < protectedPages.length; i++) {
    if (currentPage === protectedPages[i]) {
      needsAuth = true;
      break;
    }
  }
  
  // If page needs auth, check if user is logged in
  if (needsAuth) {
    var authToken = localStorage.getItem('alumni-golf-auth');
    if (!authToken || authToken !== 'authenticated') {
      // Not authenticated - redirect to homepage
      window.location.href = '/';
      return;
    }
  }
})();
