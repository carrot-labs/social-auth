(function(angular, undefined) {
  'use strict';

  angular
    .module('instagram')
    .controller('LoginController', LoginController);

  function LoginController($window, $location, $rootScope, $auth) {
    var vm = this;

    vm.instagramLogin = instagramLogin;
    vm.googleLogin = googleLogin;
    vm.emailLogin     = emailLogin;

    function instagramLogin() {
      $auth.authenticate('instagram')
        .then(function(response) {
          $window.localStorage.currentUser = JSON.stringify(response.data.user);
          $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
        })
        .catch(function(response) {
          console.error(response.data);
        });
    }

    function googleLogin() {
      $auth.authenticate('google')
        .then(function(response) {
          console.log(response);
          // $window.localStorage.currentUser = JSON.stringify(response.data.user)
        })
        .catch(function(response) {
          console.error(response);
        })
    }

    function emailLogin() {
      var credentials = {
        email: vm.credentials.email,
        password: vm.credentials.password
      };

      $auth.login(credentials)
        .then(function(response) {
          $window.localStorage.currentUser = JSON.stringify(response.data.user);
          $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
        })
        .catch(function(response) {
          console.error(response.data);
        });
    }
  }

})(angular);
