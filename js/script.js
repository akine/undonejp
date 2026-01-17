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

const formatDuration = (iso) => {
    if (!iso) {
        return null;
    }
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
        return null;
    }
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    const parts = [];
    if (hours) {
        parts.push(`${hours}時間`);
    }
    if (minutes) {
        parts.push(`${minutes}分`);
    }
    if (seconds) {
        parts.push(`${seconds}秒`);
    }
    return parts.length ? parts.join('') : null;
};

const formatViewCount = (value) => {
    const count = Number(value);
    if (!Number.isFinite(count)) {
        return null;
    }
    const formatNumber = (num) => {
        const rounded = Math.round(num * 10) / 10;
        return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
    };
    if (count >= 100000000) {
        return `再生数${formatNumber(count / 100000000)}億`;
    }
    if (count >= 10000) {
        return `再生数${formatNumber(count / 10000)}万`;
    }
    return `再生数${count.toLocaleString('ja-JP')}`;
};

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

const fetchYouTubeStats = async (ids) => {
    if (!ids.length) {
        return {};
    }
    try {
        const query = new URLSearchParams({ ids: ids.join(',') });
        const response = await fetch(`/api/youtube?${query.toString()}`);
        if (!response.ok) {
            return {};
        }
        const data = await response.json();
        return data.items || {};
    } catch (error) {
        return {};
    }
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
    if (role.includes('Undone')) {
        return 'Undone';
    }
    if (role.includes('監督')) {
        return '監督・編集';
    }
    if (role.includes('編集')) {
        return '編集';
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
    title.title = item.title || '';

    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = item.role || '';

    body.appendChild(tag);
    body.appendChild(title);
    if (item.role) {
        body.appendChild(meta);
    }

    const metrics = [];
    if (item.purpose) {
        metrics.push(item.purpose);
    } else if (item.type) {
        metrics.push(item.type);
    }
    if (item.duration) {
        metrics.push(item.duration);
    }
    if (item.result) {
        metrics.push(item.result);
    }
    if (metrics.length) {
        const detail = document.createElement('p');
        detail.className = 'meta meta-detail';
        detail.textContent = metrics.join(' / ');
        body.appendChild(detail);
    }

    if (item.url) {
        const link = document.createElement('a');
        link.className = 'arrow-link';
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = '見る';
        body.appendChild(link);
    }

    article.appendChild(media);
    article.appendChild(body);
    article.dataset.platform = item.platform || 'その他';
    article.dataset.role = resolveRoleGroup(item.role || '');
    return article;
};

const buildEnrichedItems = (items, stats) => items.map((item) => {
    const id = getYouTubeId(item.url);
    if (!id || !stats[id]) {
        return item;
    }
    const duration = item.duration || formatDuration(stats[id].duration);
    const result = item.result || formatViewCount(stats[id].viewCount);
    const viewCount = Number(stats[id].viewCount);
    return {
        ...item,
        duration: duration || item.duration,
        result: result || item.result,
        viewCount: Number.isFinite(viewCount) ? viewCount : item.viewCount
    };
});

const pickRandomItems = (items, count) => {
    const pool = [...items];
    const picks = [];
    for (let i = 0; i < count && pool.length > 0; i += 1) {
        const index = Math.floor(Math.random() * pool.length);
        picks.push(pool[index]);
        pool.splice(index, 1);
    }
    return picks;
};

const renderProductions = async () => {
    const container = document.getElementById('works-grid');
    if (!container) {
        return;
    }

    const dataSource = container.getAttribute('data-source');
    if (!dataSource) {
        container.innerHTML = '<p class="section-copy">制作実績の読み込み設定が見つかりませんでした。</p>';
        return;
    }

    const buildFilters = (items) => {
        const filterWrap = document.getElementById('works-filters');
        if (!filterWrap) {
            return;
        }
        const platformOrder = ['すべて', 'YouTube', 'TikTok', 'DMM TV', 'イベント配信'];
        const roleOrder = ['すべて', '監督・編集', '編集', 'Undone', 'その他'];
        const platformSet = new Set(items.map((item) => item.platform).filter(Boolean));
        const roleSet = new Set(items.map((item) => resolveRoleGroup(item.role || '')));
        const platforms = [
            ...platformOrder.filter((platform) => platform === 'すべて' || platformSet.has(platform)),
            ...Array.from(platformSet).filter((platform) => !platformOrder.includes(platform))
        ];
        const roles = [
            ...roleOrder.filter((role) => role === 'すべて' || roleSet.has(role)),
            ...Array.from(roleSet).filter((role) => !roleOrder.includes(role))
        ];

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

    try {
        const response = await fetch(dataSource);
        if (!response.ok) {
            throw new Error('Failed to load productions data');
        }
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items;
        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = '<p class="section-copy">現在公開できる制作実績は準備中です。</p>';
            return;
        }

        const ids = items.map((item) => getYouTubeId(item.url)).filter(Boolean);
        const uniqueIds = Array.from(new Set(ids));
        const stats = await fetchYouTubeStats(uniqueIds);
        const enrichedItems = buildEnrichedItems(items, stats);

        container.innerHTML = '';
        buildFilters(enrichedItems);
        enrichedItems.forEach((item) => {
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
    } catch (error) {
        container.innerHTML = '<p class="section-copy">制作実績の読み込みに失敗しました。時間をおいて再度お試しください。</p>';
    }
};

const renderHomeWorksMobile = async () => {
    const container = document.getElementById('home-works-grid');
    if (!container) {
        return;
    }
    const dataSource = container.getAttribute('data-source');
    if (!dataSource) {
        return;
    }

    const mediaQuery = window.matchMedia('(max-width: 720px)');

    const render = async () => {
        if (!mediaQuery.matches) {
            container.innerHTML = '';
            return;
        }
        try {
            const response = await fetch(dataSource);
            if (!response.ok) {
                throw new Error('Failed to load productions data');
            }
            const data = await response.json();
            const items = Array.isArray(data) ? data : data.items;
            if (!Array.isArray(items) || items.length === 0) {
                container.innerHTML = '<p class="section-copy">現在公開できる制作実績は準備中です。</p>';
                return;
            }

            const ids = items.map((item) => getYouTubeId(item.url)).filter(Boolean);
            const uniqueIds = Array.from(new Set(ids));
            const stats = await fetchYouTubeStats(uniqueIds);
            const enrichedItems = buildEnrichedItems(items, stats);

            const millionHits = enrichedItems.filter((item) => Number(item.viewCount) >= 1000000);
            const sourceItems = millionHits.length ? millionHits : enrichedItems;
            if (!sourceItems.length) {
                container.innerHTML = '<p class="section-copy">現在公開できる制作実績は準備中です。</p>';
                return;
            }
            const pickCount = Math.min(
                sourceItems.length,
                sourceItems.length >= 2 && Math.random() < 0.5 ? 1 : 2
            );
            const picked = pickRandomItems(sourceItems, pickCount);

            container.innerHTML = '';
            picked.forEach((item) => {
                const card = createCard(item);
                container.appendChild(card);
                observer.observe(card);
            });
        } catch (error) {
            container.innerHTML = '<p class="section-copy">制作実績の読み込みに失敗しました。時間をおいて再度お試しください。</p>';
        }
    };

    render();
    mediaQuery.addEventListener('change', render);
};

renderProductions();
renderHomeWorksMobile();
const renderHomeWorksStaticMetrics = async () => {
    const cards = Array.from(document.querySelectorAll('.home-works-static .card'));
    if (!cards.length) {
        return;
    }
    const ids = cards
        .map((card) => card.dataset.youtubeId || card.querySelector('.arrow-link')?.getAttribute('href'))
        .map((value) => (value?.startsWith('http') ? getYouTubeId(value) : value))
        .filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) {
        return;
    }

    const stats = await fetchYouTubeStats(uniqueIds);
    cards.forEach((card) => {
        const link = card.querySelector('.arrow-link');
        const id = card.dataset.youtubeId || (link ? getYouTubeId(link.getAttribute('href')) : null);
        const data = id ? stats[id] : null;
        if (!data) {
            return;
        }
        const duration = formatDuration(data.duration);
        const result = formatViewCount(data.viewCount);
        const metrics = [duration, result].filter(Boolean);
        if (!metrics.length) {
            return;
        }
        let detail = card.querySelector('.meta-detail');
        if (!detail) {
            detail = document.createElement('p');
            detail.className = 'meta meta-detail';
            const meta = card.querySelector('.meta');
            if (meta) {
                meta.after(detail);
            } else {
                const body = card.querySelector('.card-body');
                if (body) {
                    body.appendChild(detail);
                }
            }
        }
        detail.textContent = metrics.join(' / ');
    });
};

renderHomeWorksStaticMetrics();