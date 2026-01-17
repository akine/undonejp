$(function () {
    const $nav = $('#js-navi');
    const $hamburger = $('#js-hamburger');

    $hamburger.on('click', function () {
        $nav.toggleClass('open');
    });

    $nav.find('a').on('click', function () {
        $nav.removeClass('open');
    });

    $('a[href^="#"]').on('click', function (e) {
        const targetId = $(this).attr('href');
        const $target = $(targetId);
        if ($target.length) {
            e.preventDefault();
            $('html, body').animate({ scrollTop: $target.offset().top - 60 }, 600, 'swing');
        }
    });
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('.fade').forEach((el) => observer.observe(el));

const renderProductions = () => {
    const container = document.getElementById('works-grid');
    if (!container) {
        return;
    }

    const dataSource = container.getAttribute('data-source');
    if (!dataSource) {
        container.innerHTML = '<p class="section-copy">制作実績の読み込み設定が見つかりませんでした。</p>';
        return;
    }

    // 日本語の読みやすさを保つため、DOMを組み立てて安全に反映する
    const getYouTubeId = (url) => {
        if (!url) {
            return null;
        }

        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes('youtu.be')) {
                return parsed.pathname.replace('/', '') || null;
            }
            if (parsed.hostname.includes('youtube.com')) {
                if (parsed.searchParams.get('v')) {
                    return parsed.searchParams.get('v');
                }
                if (parsed.pathname.startsWith('/shorts/')) {
                    return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
                }
                if (parsed.pathname.startsWith('/embed/')) {
                    return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
                }
            }
        } catch (error) {
            // URLの形式が想定外の場合は自動取得を諦める
            return null;
        }

        return null;
    };

    const resolveThumbnail = (item) => {
        if (item.thumbnail) {
            return item.thumbnail;
        }
        const youtubeId = getYouTubeId(item.url);
        if (youtubeId) {
            return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }
        return '';
    };

    const resolveRoleGroup = (role) => {
        if (!role) {
            return 'その他';
        }
        if (role.includes('監督')) {
            return '監督・編集';
        }
        if (role.includes('編集')) {
            return '編集';
        }
        if (role.includes('制作')) {
            return '制作';
        }
        return 'その他';
    };

    const createCard = (item) => {
        const article = document.createElement('article');
        article.className = 'card fade';

        const media = document.createElement('div');
        media.className = 'card-media';
        const resolvedThumbnail = resolveThumbnail(item);
        if (resolvedThumbnail) {
            const img = document.createElement('img');
            img.src = resolvedThumbnail;
            img.alt = item.alt || item.title || '制作実績';
            media.appendChild(img);
        } else {
            media.classList.add('card-media-empty');
            const placeholder = document.createElement('div');
            placeholder.className = 'media-placeholder';
            placeholder.textContent = item.platform || 'Production';
            media.appendChild(placeholder);
        }

        const body = document.createElement('div');
        body.className = 'card-body';

        const tag = document.createElement('p');
        tag.className = 'tag';
        const tagParts = [item.tag, item.platform].filter(Boolean);
        tag.textContent = tagParts.length ? tagParts.join(' / ') : 'Production';

        const title = document.createElement('h3');
        title.textContent = item.title || '';

        const meta = document.createElement('p');
        meta.className = 'meta';
        meta.textContent = item.role || '';

        body.appendChild(tag);
        body.appendChild(title);
        if (item.role) {
            body.appendChild(meta);
        }

        if (item.url) {
            const link = document.createElement('a');
            link.className = 'arrow-link';
            link.href = item.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Watch';
            body.appendChild(link);
        }

        article.appendChild(media);
        article.appendChild(body);
        article.dataset.platform = item.platform || 'その他';
        article.dataset.role = resolveRoleGroup(item.role || '');
        return article;
    };

    const buildFilters = (items) => {
        const filterWrap = document.getElementById('works-filters');
        if (!filterWrap) {
            return;
        }
        const platforms = ['すべて', ...new Set(items.map((item) => item.platform).filter(Boolean))];
        const roles = ['すべて', ...new Set(items.map((item) => resolveRoleGroup(item.role || '')))];

        const createGroup = (label, groupKey, options) => {
            const group = document.createElement('div');
            group.className = 'filter-group';
            const title = document.createElement('span');
            title.className = 'filter-label';
            title.textContent = label;
            group.appendChild(title);
            options.forEach((option, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'filter-button';
                if (index === 0) {
                    button.classList.add('active');
                }
                button.dataset.filterGroup = groupKey;
                button.dataset.filterValue = option;
                button.textContent = option;
                group.appendChild(button);
            });
            filterWrap.appendChild(group);
        };

        filterWrap.innerHTML = '';
        createGroup('プラットフォーム', 'platform', platforms);
        createGroup('担当', 'role', roles);
    };

    const applyFilters = () => {
        const filterWrap = document.getElementById('works-filters');
        if (!filterWrap) {
            return;
        }
        const activeButtons = filterWrap.querySelectorAll('.filter-button.active');
        const filters = Array.from(activeButtons).reduce((acc, button) => {
            acc[button.dataset.filterGroup] = button.dataset.filterValue;
            return acc;
        }, {});

        const cards = container.querySelectorAll('.card');
        let visibleCount = 0;
        cards.forEach((card) => {
            const platformMatch = !filters.platform || filters.platform === 'すべて' || card.dataset.platform === filters.platform;
            const roleMatch = !filters.role || filters.role === 'すべて' || card.dataset.role === filters.role;
            const isVisible = platformMatch && roleMatch;
            card.style.display = isVisible ? '' : 'none';
            if (isVisible) {
                visibleCount += 1;
            }
        });

        const countLabel = document.getElementById('works-count');
        if (countLabel) {
            countLabel.textContent = `表示中: ${visibleCount}件`;
        }
    };

    fetch(dataSource)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to load productions data');
            }
            return response.json();
        })
        .then((data) => {
            const items = Array.isArray(data) ? data : data.items;
            if (!Array.isArray(items) || items.length === 0) {
                container.innerHTML = '<p class="section-copy">現在公開できる制作実績は準備中です。</p>';
                return;
            }

            container.innerHTML = '';
            buildFilters(items);
            items.forEach((item) => {
                container.appendChild(createCard(item));
            });

            // 追加したカードもスクロールで表示アニメーションを適用
            container.querySelectorAll('.fade').forEach((el) => observer.observe(el));

            const filterWrap = document.getElementById('works-filters');
            if (filterWrap) {
                filterWrap.addEventListener('click', (event) => {
                    const button = event.target.closest('.filter-button');
                    if (!button) {
                        return;
                    }
                    const group = button.dataset.filterGroup;
                    filterWrap.querySelectorAll(`.filter-button[data-filter-group="${group}"]`).forEach((btn) => {
                        btn.classList.remove('active');
                    });
                    button.classList.add('active');
                    applyFilters();
                });
            }
            applyFilters();
        })
        .catch(() => {
            container.innerHTML = '<p class="section-copy">制作実績の読み込みに失敗しました。時間をおいて再度お試しください。</p>';
        });
};

renderProductions();