(function(angular, undefined) {
  'use strict';

  angular
    .module('instagram')
    .controller('HomeController', HomeController);

  function HomeController($scope, $window, $rootScope, $auth, $http, API) {
    var vm = this;

    vm.photos = [];

    vm.init = init;
    vm.isAuthenticated = isAuthenticated;
    vm.linkInstagram = linkInstagram;

    vm.init();

    function init() {
      if($auth.isAuthenticated() && ($rootScope.currentUser && $rootScope.currentUser.username)) {
        API.getFeed().success(function(data) {
          vm.photos = data;
        });
      }
    }

    function isAuthenticated() {
      return $auth.isAuthenticated();
    }

    function linkInstagram() {
      $auth.link('instagram')
        .then(function(response) {
          $window.localStorage.currentUser = JSON.stringify(response.data.user);
          $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);

          API.getFeed().success(function(data) {
            vm.photos = data;
          });
        });
    }

    $scope.get = function () {
      $http.get('/protected')
        .success(function(data, status) {
          console.info(status, data);
        })
        .error(function(data, status) {
          console.error(status, data);
        });
    };
  }

})(angular);
