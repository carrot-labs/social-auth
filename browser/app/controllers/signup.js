(function(angular, undefined) {
  'use strict';

  angular
    .module('instagram')
    .controller('SignupController', SignupController);

  function SignupController($auth) {
    var vm = this;

    vm.signup = signup;

    function signup() {
      var credentials = {
        email: vm.credentials.email,
        password: vm.credentials.password,
      };

      $auth.signup(credentials)
        .catch(function(response) {
          console.log(response.data);
        });
    }
  }

})(angular);
