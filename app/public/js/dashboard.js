// ------------------- //
// Google Maps loader //
// ----------------- //
var gmapsApiLoad;
var googleMapsPromise = new Promise(function(resolve, reject) { gmapsApiLoad = resolve; });
var map, directionsRenderer;

// ----------------------- //
// Main data store (Vuex) //
// --------------------- //
var store = new Vuex.Store({
	state: {
		customers: [], // Because of reasons with the way I've done the DOM, this should be an empty array not null
		publications: null,

		deliveryDataRaw: null,
		directionsServiceResults: null
	},

	mutations: {
		setCustomers: function(state, v) { state.customers = v; },
		setPublications: function(state, v) { state.publications = v; },
		setDeliveryDataRaw: function(state, v) { state.deliveryDataRaw = v; },
		setDirectionsServiceResults: function(state, v) { state.directionsServiceResults = v; }
	},

	getters: {
		getPublicationById: function(state) {
			return function(id) {
				for (var i = 0; i < state.publications.length; i++)
					if (state.publications[i].id == id)
						return state.publications[i];
			}
		},

		getRequiredPublications: function(state) {
			var publicationsRequired = {};
			for (var k = 0; route = state.deliveryDataRaw[k]; k++) {
				for (var i = 0; delivery = route[i]; i++) {
					for (var j = 0; pubname = delivery.publication_name[j]; j++) {
						if (!publicationsRequired[pubname])
							publicationsRequired[pubname] = [0, 0, 0]; // Should be an array with as many elements as the number of drivers + 1 (last is total)
						publicationsRequired[pubname][k]++;
						publicationsRequired[pubname][2]++; // References last index (i.e. the total column)
					}
				}
			}
			return publicationsRequired;
		}
	},

	actions: {
		fetchCustomers: function(context) {
			ajax("/customers").then(data => { // Async call to server to fetch data
				if (data.success) {
					for (var i = data.results.length; i--;)
						data.results[i].subs = null; // Add holder for the user's subscriptions
					context.commit('setCustomers', data.results);
				}
			});
		},

		fetchPublications: function(context) {
			ajax("/publications").then(data => {
				if (data.success)
					context.commit("setPublications", data.results);
			});
		},

		fetchRoutes: function(context) {
			var start = {lat: 53.562447, lng: -2.885611};
			var directionsService;

			googleMapsPromise.then(function() {
				directionsService = new google.maps.DirectionsService();
				return ajax("/deliverylist/" + today());
			}).then(function(data) {
				if (!data.success) return Promise.reject(data.err);

				// For each driver, calculate a route with their waypoints
				var promises = [];
				context.commit("setDeliveryDataRaw", data.results);

				for (var i = 0; i < data.results.length; i++) { // Loop through all the driver arrays
					promises.push(new Promise(function(resolve, reject) { // Convert the directionsService calls into Promises

						// Strip out data such as name and get a list of locations for the Google DirectionsService
						var waypoints = [];
						for (var j = 0; delivery = data.results[i][j]; j++)
							waypoints.push({
								location: delivery.address1 + "," + delivery.postcode,
								stopover: true
							});

						// Call the DirectionsService route function to get an optimised route for this driver's deliveries				
						directionsService.route({
							origin: start,
							destination: start,
							travelMode: "DRIVING",
							waypoints: waypoints,
							optimizeWaypoints: true
						}, function(response, status) {
							if (status == "OK") resolve(response); // If all was good, resolve the promise
							else reject(status); // Else reject it
						});
					}));
				}
				return Promise.all(promises); // Return a Promise that will resolve when all driver's routes have been fetched

			}).then(function(responses) {
				context.commit("setDirectionsServiceResults", responses);
			});
		},

		fetchCustomerSubs: function(context, customer) {
			// customer.id
			ajax("/customers/" + customer.id + "/subscriptions").then(data => {
				if (data.success)
					customer.subs = data.results;
			});
		}
	}
});

// --------------- //
// Vue components //
// ------------- //
var Overview = {
	template: '#route-view-overview',

	computed: {

	},

	mounted: function() {
		//// Initialise charts
		Promise.all([storeNotNull("publications"), ajax("/weeklysubsbyday/" + today())]).then(function(d) { // Wait for publication data to load and also request `/weeklysubsbyday`

			// Generate RGBA colors for each of the publications
			var publicationColors = [];
			$.each(store.state.publications, function(_, pub) {
				publicationColors[pub.id] = {
					bg: hexToRgba(pub.color, 0.6),
					border: hexToRgba(pub.color)
				};
			});

			// Create dataset for weekly subscriptions by day chart
			var byDayDatasets = [];
			$.each(d[1].results, function(publication_id, el) {
				byDayDatasets.push({
					label: store.getters.getPublicationById(publication_id).name,
					data: el.slice(0, 7),
					backgroundColor: publicationColors[publication_id].bg,
					borderColor: publicationColors[publication_id].border,
					borderWidth: 1
				});
			});

			// Create the weekly subscriptions by day chart
			new Chart($('#chart-weekly-subs-by-day').get(0), {
				type: "bar",
				data: {
					labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
					datasets: byDayDatasets
				},
				options: {
					scales: {
						yAxes: [{
							ticks: {beginAtZero:true},
							stacked: true
						}]
					},
					legend: {display: false}
				}
			});

			// Create dataset for weekly subscriptions by day chart
			var bySubData = {
				labels: [],
				datasets: [{
					data: [],
					backgroundColor: [],
					borderColor: [],
					borderWidth: 1
				}]
			};
			$.each(d[1].results, function(publication_id, el) {
				bySubData.labels.push(store.getters.getPublicationById(publication_id).name);
				bySubData.datasets[0].data.push(el[7]);
				bySubData.datasets[0].backgroundColor.push(publicationColors[publication_id].bg);
				bySubData.datasets[0].borderColor.push(publicationColors[publication_id].border);
			})

			// Create the weekly subscriptions by subscription chart
			new Chart($('#chart-weekly-subs-by-pub').get(0), {
				type: "doughnut",
				data: bySubData,
				options: {legend: {display: false}}
			});
		});
	}
};

var Routes = {
	template: '#route-view-driver-routes',

	computed: {
		currentDeliveryRoute: function() {
			return store.state.deliveryDataRaw ? store.state.deliveryDataRaw[this.$route.params.driver - 1] : null;
		},

		waypointOrder: function() {
			return store.state.directionsServiceResults ? store.state.directionsServiceResults[this.$route.params.driver - 1].routes[0].waypoint_order : null;
		}
	},

	watch: {
		'$route': function() { // Triggers when the route has a parameter change (I.E. when the driver is changed) but not when the route is changed to a different component.
			this.setMapDirections();
		}
	},

	mounted: function() {
		this.initialiseMap();
	},

	methods: {
		initialiseMap: function() {
			var thisVue = this;
			Promise.all([storeNotNull("directionsServiceResults"), googleMapsPromise]).then(function() {
				map = new google.maps.Map($('#route-map').get(0), {
					center: {lat: 53.568731, lng: -2.885006},
					zoom: 13,
					disableDefaultUI: true
				});

				directionsRenderer = new google.maps.DirectionsRenderer();
				directionsRenderer.setMap(map);
				directionsRenderer.setPanel($('#route-directions').get(0));
				thisVue.setMapDirections();
			});
		},

		setMapDirections: function() {
			directionsRenderer.setDirections(store.state.directionsServiceResults[this.$route.params.driver - 1]);
		}	
	}
};

var Customers = {
	template: '#route-view-customers',

	data: function() { return {
		selectedCustomerId: -1,
		selectedCustomer: null,
		searchText: ""
	}},

	computed: {
		filteredCustomers: function() {
			var thisVue = this;
			return thisVue.customers.filter(function(customer) {
				return customer.name.toLowerCase().indexOf(thisVue.searchText.toLowerCase()) > -1 ||
					customer.email.toLowerCase().indexOf(thisVue.searchText.toLowerCase()) > -1
			});
		},

		customers: function() { return store.state.customers; },
	},

	methods: {
		selectCustomer: function(e) {
			this.selectedCustomerId = $(e.target).closest('tr').data('customer-id');
			this.selectedCustomer = this.getCustomerById(this.selectedCustomerId);

			if (this.selectedCustomer.subs === null)
			 	store.dispatch('fetchCustomerSubs', this.selectedCustomer); // Lazy-load the customer's subscriptions
		},

		getCustomerById: function(id) {
			for (var i = 0; customer = this.customers[i]; i++)
				if (customer.id == id)
					return customer;
			return null;
		}
	}
};

var Publications = {
	template: '#route-view-publications',
};

var Metrics = {
	template: '#route-view-metrics',
};

// ------------- //
// Main Vue app //
// ----------- //
var router = new VueRouter({
	routes: [
		{path: "/", redirect: "/overview"},
		{path: "/overview", component: Overview},
		{path: "/routes", redirect: "/routes/1"},
		{path: "/routes/:driver", component: Routes},
		{path: "/customers", component: Customers},
		{path: "/publications", component: Publications},
		{path: "/metrics", component: Metrics}
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
		store.dispatch('fetchCustomers');
		store.dispatch('fetchPublications');
		store.dispatch('fetchRoutes');
	},

	methods: {
		fetchUser: function() {
			var thisVue = this;
			ajax("/user").then(function(d) {
				thisVue.user = d.user;
			});
		}
	},

	router: router
});

/**
 * Returns the current day in YYYY-MM-DD format.
 * @returns {string}
 */
function today() {
	var dt = new Date();
	var m = dt.getMonth(), d = dt.getDate();
	return dt.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}

/**
 * Create a promise that will resolve when a specified property in the store updates.
 * @param {string} property The name of the property to watch
 * @returns {Promise}
 */
function storeWatch(property) {
	return new Promise(function(resolve, reject) {
		store.watch(function(state) { return state[property]; },
		function() { resolve(); });
	});
}

/**
 * Creates a promise that will resolve when the specified property in the store is not null
 * @param {string} property The name of the property to watch
 * @param {Promise}
 */
function storeNotNull(property) {
	if (store.state[property] == null) return storeWatch(property);
	else return Promise.resolve();
}

/**
 * Converts a HEX color to RGBA
 * @param {string} color The HEX color to Convert
 * @param {number} [alpha=1] The alpha value for the RGBA string
 * @returns {string}
 */
function hexToRgba(color, alpha) {
	var r = parseInt(color.substr(0, 2), 16);
	var g = parseInt(color.substr(2, 2), 16);
	var b = parseInt(color.substr(4, 2), 16);
	return "rgba(" + r + ", " + g + ", " + b + ", " + (alpha || 1) + ")";
}