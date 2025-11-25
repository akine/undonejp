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
