$("#js-hamburger").click(function() {
    $("#js-navi").toggleClass("active");
    $("#js-hamburger").toggleClass("active");
    $("#js-navi-a").toggleClass("active-a");
});

/*slick*/
$(document).ready(function() {
    $('.slide').slick({
        slideToShow: 3,
        slideToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
        prevArrow: '<div class="slide-arrow prev-arrow"></div>',
        nextArrow: '<div class="slide-arrow next-arrow"></div>',
        responsive: [{
            breakepoint: 800,
            settings: {
                slideToShow: 1,
            }
        }]
    });
});