var router = new VueRouter({
	routes: [
		{path: "/", redirect: "/overview"},
		{path: "/overview", component: {template: $('#route-view-overview').html()}},
		{path: "/routes", redirect: "/routes/1"},
		{path: "/routes/:driver", component: {template: $('#route-view-driver-routes').html()}},
		{path: "/customers", component: {template: $('#route-view-customers').html()}},
		{path: "/publications", component: {template: $('#route-view-publications').html()}},
		{path: "/metrics", component: {template: $('#route-view-metrics').html()}}
	],

	linkActiveClass: "active"
});

var vm = new Vue({
	el: '#app',

	data: {
		user: {}
	},

	mounted: function() {
		this.fetchUser();
	},

	methods: {
		fetchUser: function() {
			var thisVue = this;
			ajax('/user').then(function(d) {
				thisVue.$data.user = d.user;
			});
		}
	},

	router: router
});