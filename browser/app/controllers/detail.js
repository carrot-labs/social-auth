(function(angular, undefined) {
  'use strict';

  angular
    .module('instagram')
    .controller('DetailController', DetailController);

  function DetailController($rootScope, $location, API) {
    var vm = this;

    var mediaId = $location.path().split('/').pop();

    vm.init = init;

    vm.init();

    function init() {

      console.log(mediaId);

      API.getMediaById(mediaId).then(function(a, b) {
        console.log(a, b);
      }, function(a, b) {
        console.log(a, b);
      });

      // API.getMediaById(mediaId).success(function(media) {
      //   vm.hasLiked = media.user_has_liked;
      //   vm.photo = media;
      //   console.log(media);
      // }).error(function(r) {
      //   console.log(r);
      // })

    }

  }

})(angular);
