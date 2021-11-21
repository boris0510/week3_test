<template>
  <Loading :active="isLoading" style="z-index: 9999" />
  <div class="container">
    <div class="row">
      <div class="col-4">
        <select v-model="currentCategory" @change="getBusData">
          <option value="">請選擇縣市</option>
          <option :value="item.City" v-for="item in city" :key="item">
            {{ item.CityName }}
          </option>
        </select>
        <br />
        <select v-model="currentRoute">
          <option value="">請選擇路線</option>
          <option :value="item.RouteName.Zh_tw" v-for="item in busRoute" :key="item">
            {{ item.RouteName.Zh_tw }}
          </option>
        </select>
        <br />
        <button
          type="button"
          class="btn btn-primary btn-sm"
          @click="setBusData(currentRoute)"
        >
          查詢
        </button>
      </div>
      <div class="col-8">
        <div id="mapid" class="map"></div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import Wkt from 'wicket';
import 'leaflet.markercluster/dist/leaflet.markercluster';
import getAuthorizationHeader from '../tools/AuthorizationHeader';

let map = {};
let lineLayer = {};
const redIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default {
  name: 'Home',
  data() {
    return {
      userLocation: {
        longitude: 0,
        latitude: 0,
      },
      city: [],
      currentCategory: '',
      currentRoute: '',
      busRoute: [],
      busSite: [],
      busLine: [],
      busRealTime: [],
      busEstimate: [],
      isLoading: false,
    };
  },
  methods: {
    getData(url, dataName) {
      this.isLoading = true;
      this.axios
        .get(url, {
          headers: getAuthorizationHeader(),
        })
        .then((response) => {
          this[dataName] = response.data;
        })
        .catch((err) => {
          console.log(err);
        });
      setTimeout(() => {
        this.isLoading = false;
      }, 1500);
    },
    getUserLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.userLocation.longitude = position.coords.longitude;
            this.userLocation.latitude = position.coords.latitude;
            map.setView([this.userLocation.latitude, this.userLocation.longitude]);
            map.panTo([this.userLocation.latitude, this.userLocation.longitude]);
            L.marker([this.userLocation.latitude, this.userLocation.longitude])
              .addTo(map)
              .bindPopup('您的位置')
              .openPopup();
          },
          (e) => {
            const msg = e.message;
            console.error(msg);
          },
        );
      }
    },
    getBusData() {
      this.getData(
        `https://ptx.transportdata.tw/MOTC/v2/Bus/Route/City/${this.currentCategory}?$format=JSON`,
        'busRoute',
      );
      this.getData(
        `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/City/${this.currentCategory}?$format=JSON`,
        'busSite',
      );
      this.getData(
        `https://ptx.transportdata.tw/MOTC/v2/Bus/Shape/City/${this.currentCategory}?$format=JSON`,
        'busLine',
      );
      this.getData(
        `https://ptx.transportdata.tw/MOTC/v2/Bus/RealTimeByFrequency/City/${this.currentCategory}?$format=JSON`,
        'busRealTime',
      );
      this.getData(
        `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/${this.currentCategory}?$format=JSON`,
        'busEstimate',
      );
    },
    setBusData(name) {
      const filterBusSite = this.busSite.filter((item) => item.RouteName.Zh_tw === name);
      const filterBusLine = this.busLine.filter((item) => item.RouteName.Zh_tw === name);
      const filterBusRealTime = this.busRealTime.filter((item) => item.RouteName.Zh_tw === name);
      // const filterBusEstimate = this.busEstimate.filter((item) => item.RouteName.Zh_tw === name);
      this.removeMarker();
      this.renderSiteMarker(filterBusSite);
      this.drawLine(filterBusLine[0].Geometry);
      this.renderBusMarker(filterBusRealTime);
    },
    renderSiteMarker(data) {
      data[0].Stops.forEach((item) => {
        L.marker([item.StopPosition.PositionLat, item.StopPosition.PositionLon]).addTo(map);
      });
      map.setView([
        data[0].Stops[0].StopPosition.PositionLat,
        data[0].Stops[0].StopPosition.PositionLon,
      ]);
    },
    renderBusMarker(data) {
      data.forEach((item) => {
        L.marker([item.BusPosition.PositionLat, item.BusPosition.PositionLon], {
          icon: redIcon,
        }).addTo(map);
      });
      // map.setView([
      //   data[0].Stops[0].StopPosition.PositionLat,
      //   data[0].Stops[0].StopPosition.PositionLon,
      // ]);
    },
    removeMarker() {
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });
    },
    drawLine(geo) {
      map.removeLayer(lineLayer);
      const wicket = new Wkt.Wkt();
      const geoTojson = wicket.read(geo).toJson();
      const styleLine = {
        color: '#07B041',
        weight: 5,
        opacity: 0.5,
      };
      lineLayer = L.geoJSON(geoTojson, {
        style: styleLine,
      }).addTo(map);
      lineLayer.addData(geoTojson);
      map.fitBounds(lineLayer.getBounds());
    },
  },
  mounted() {
    this.getUserLocation();
    this.getData('https://gist.motc.gov.tw/gist_api/V3/Map/Basic/City?$format=JSON', 'city');

    map = L.map('mapid').setView([0, 0], 14);
    L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: process.env.VUE_APP_MAPKEY,
      },
    ).addTo(map);
  },
};
</script>

<style scoped>
.map {
  width: 100%;
  height: 100vh;
}
.scroll {
  height: calc(100vh - 50px);
  overflow-y: scroll;
}
.scroll::-webkit-scrollbar {
  display: none;
}
</style>
