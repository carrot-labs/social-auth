(function(angular, undefined) {
  'use strict';

  angular
    .module('instagram', [
      'ngMaterial',
      'ui.router',
      'satellizer'
    ])
    .config(config)
    .run(run);

    function config($stateProvider, $urlRouterProvider, $authProvider, $mdIconProvider) {
      $mdIconProvider.defaultIconSet('assets/icons/core-icons.svg', 24);

      $stateProvider.state('home', {
        url: '/',
        templateUrl: 'views/home.html',
        controller: 'HomeController',
        controllerAs: 'vm'
      });

      $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'views/login.html',
        controller: 'LoginController',
        controllerAs: 'vm'
      });

      $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'views/signup.html',
        controller: 'SignupController',
        controllerAs: 'vm'
      });

      $stateProvider.state('detail', {
        url: '/photo/:id',
        templateUrl: 'views/detail.html',
        controller: 'DetailController',
        controllerAs: 'vm'
      });

      /**
       * Auth config
       */
      $authProvider.loginUrl = '/auth/login';
      $authProvider.signupUrl = '/auth/signup';

      $authProvider.google({
        clientId: '510965341898-smuji2l0v3tbc9o8rbvpco7ig5r8f2mf.apps.googleusercontent.com',
      });

      $authProvider.oauth2({
        name: 'instagram',
        url: '/auth/instagram',
        redirectUri: 'http://localhost:3000',
        clientId: '63e49eea7c34456ea9636a59a4541298',
        requiredUrlParams: ['scope'],
        scope: ['likes'],
        scopeDelimiter: '+',
        authorizationEndpoint: 'https://api.instagram.com/oauth/authorize'
      });
    }

    function run($rootScope, $window, $auth) {
      if($auth.isAuthenticated()) {
        $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
      }
    }

})(angular);
