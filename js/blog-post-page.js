document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('blogPostContainer');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'), 10);

    if (isNaN(postId) || typeof blogPosts === 'undefined') {
        container.innerHTML = '<h2>Post not found</h2>';
        return;
    }

    const post = blogPosts.find(p => p.id === postId);

    if (!post) {
        container.innerHTML = '<h2>Post not found</h2><p>Sorry, we couldn\'t find the article you were looking for.</p>';
        return;
    }

    document.title = `${post.title} - LuxeMart`;

    container.innerHTML = `
        <article class="blog-post-article">
            <header class="blog-post-header">
                <h1 class="blog-post-title">${post.title}</h1>
                <div class="blog-post-meta">
                    <span>${post.category}</span> &bull; <span>${post.date}</span> &bull; <span>${post.readTime}</span>
                </div>
            </header>
            <img src="${post.image}" alt="${post.title}" class="blog-post-image">
            <div class="blog-post-content">${post.content}</div>
        </article>
    `;
});