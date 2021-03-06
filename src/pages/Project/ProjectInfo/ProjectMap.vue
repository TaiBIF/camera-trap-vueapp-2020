<template>
  <div class="project-map">
    <l-map
      style="height: 395px"
      :zoom="zoom"
      :center="mapCenter"
      :options="options"
      @update:center="centerUpdated"
      @update:zoom="zoomUpdated"
    >
      <l-tile-layer :url="url" :attribution="attribution" />
      <l-layer-group
        v-if="mapMode === 'byStudyArea'"
        layer-type="overlay"
        name="Layer StudyArea"
      >
        <l-circle
          v-for="(area, idx) in areas"
          :key="`project-area-${idx}`"
          :lat-lng="area.position"
          :draggable="false"
          :radius="studyAreaRadius"
          :color="markerColor.area"
          :fillColor="markerColor.area"
          :fillOpacity="showSpecies ? 0.1 : 0.8"
          @click="selectArea(area.path)"
        >
          <l-tooltip
            :content="area.title"
            :options="{ permanent: true, direction: 'center' }"
          ></l-tooltip>
        </l-circle>
      </l-layer-group>
      <l-layer-group
        v-if="mapMode === 'byCameraLocation' && !showSpecies"
        :className="'site-container'"
        layer-type="overlay"
        name="Layer Camera"
      >
        <l-marker
          v-for="(camera, idx) in cameras"
          :key="`project-camera-${idx}`"
          :icon="camera.icon"
          :lat-lng="camera.position"
          :draggable="false"
          @click="selectCamera(camera.id)"
          @mouseover="$emit('hoverCamera', camera.id)"
          @mouseout="$emit('hoverCamera')"
        >
          <l-tooltip
            :content="camera.name"
            :options="{ permanent: true, direction: 'top' }"
          />
        </l-marker>
      </l-layer-group>
      <l-layer-group
        v-if="mapMode === 'byCameraLocation' && showSpecies"
        :className="'site-container'"
        layer-type="overlay"
        name="Layer Camera"
      >
        <l-circle
          v-for="(camera, idx) in cameras"
          :key="`project-camera-${idx}`"
          :lat-lng="camera.position"
          :draggable="false"
          :radius="cameraRadius"
          :color="markerColor.camera"
          :fillColor="markerColor.camera"
          :fillOpacity="0.1"
          @click="selectCamera(camera.id)"
          @mouseover="$emit('hoverCamera', camera.id)"
          @mouseout="$emit('hoverCamera')"
        >
          <l-tooltip
            :content="camera.name"
            :options="{ permanent: true, direction: 'center' }"
          />
        </l-circle>
      </l-layer-group>
      <l-layer-group
        v-if="showSpecies"
        layer-type="overlay"
        name="Layer Species"
      >
        <l-circle
          v-for="(species, idx) in speciesMarkers"
          :key="`project-species-${idx}`"
          :lat-lng="species.position"
          :draggable="false"
          :radius="species.radius"
          :color="species.color"
          :fillColor="species.color"
          :fillOpacity="1"
        >
        </l-circle>
      </l-layer-group>
      <l-layer-group
        v-if="showForestBoundary"
        layer-type="overlay"
        name="Layer ForestBoundary"
      >
        <l-polygon
          v-for="item in forestBoundary"
          :key="item.id"
          :lat-lngs="item.points"
          :fillColor="'rgba(255,140,35,.15)'"
          :stroke="true"
          :fillOpacity="1"
          :color="'#FFAF00'"
        />
      </l-layer-group>
      <l-control v-if="showSpecies" position="topright" class="species__legend">
        <div v-for="species in speciesLegend" :key="species.id">
          <span :style="{ backgroundColor: species.color }"></span>
          {{ species.name }}
        </div>
      </l-control>
    </l-map>
    <div class="checkbox__container checkbox">
      <div>
        <input
          type="checkbox"
          name="show-species"
          id="show-species"
          value="1"
          v-model="showSpecies"
        />
        <label for="show-species">顯示物種</label>
      </div>
      <div>
        <input
          type="checkbox"
          name="show-woods"
          id="show-woods"
          value="1"
          v-model="showForestBoundary"
        />
        <label for="show-woods">在地圖顯示林班地範圍</label>
      </div>
    </div>
    <div class="range__container">
      <input
        type="range"
        name="speciesDate"
        v-model="displaySpeciesDate"
        step="1"
        min="0"
        :max="totalDisplayMonth - 1"
        :disabled="!showSpecies"
        @mousedown="mousedownSlider"
        @mousemove="mousemoveSlider"
        @mouseup="mouseupSlider"
      />
      <div
        v-show="displayCurrentDate.show"
        class="range__current"
        :style="{ left: displayCurrentDate.x + 'px' }"
      >
        {{ currentDisplayDate }}
      </div>
      <div class="range__display">
        <span>{{ speciesGroupStartDate }}</span>
        <span>{{ speciesGroupEndDate }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import {
  LCircle,
  LControl,
  LLayerGroup,
  LMap,
  LMarker,
  LPolygon,
  LTileLayer,
  LTooltip,
} from 'vue2-leaflet';
import { createNamespacedHelpers } from 'vuex';
import { setTwoDigitFormat } from '@/utils/dateHelper';
import L from 'leaflet';
import chartColors from '@/constant/chartColors';
import idx from 'idx';
import 'leaflet/dist/leaflet.css';

const studyAreas = createNamespacedHelpers('studyAreas');
const forest = createNamespacedHelpers('forest');

const CameraIcon = L.icon({
  iconUrl: '/assets/common/marker-icon@2x.png',
  iconSize: [66, 120],
  iconAnchor: [33, 80],
  popupAnchor: [-3, -76],
  shadowSize: [66, 120],
  shadowAnchor: [31, 77],
});

const ErrorCameraIcon = L.icon({
  iconUrl: '/assets/common/marker-icon-error@2x.png',
  iconSize: [66, 120],
  iconAnchor: [30, 80],
  popupAnchor: [-3, -80],
  shadowSize: [66, 120],
  shadowAnchor: [33, 80],
});

const CameraIconSelect = L.icon({
  iconUrl: '/assets/common/marker-icon-select@2x.png',
  iconSize: [66, 120],
  iconAnchor: [33, 80],
  popupAnchor: [-3, -76],
  shadowSize: [66, 120],
  shadowAnchor: [31, 77],
});

const ErrorCameraIconSelect = L.icon({
  iconUrl: '/assets/common/marker-icon-error-select@2x.png',
  iconSize: [66, 120],
  iconAnchor: [30, 80],
  popupAnchor: [-3, -80],
  shadowSize: [66, 120],
  shadowAnchor: [33, 80],
});

const defaultZoom = { byStudyArea: 8, byCameraLocation: 12 };
const defaultPosition = { lng: 120.982024, lat: 23.973875 };
const positonShift = [
  { lng: 0.0000012, lat: 0.000002 },
  { lng: -0.0000012, lat: 0.000002 },
  { lng: -0.000002, lat: -0.000001 },
  { lng: 0, lat: -0.000003 },
  { lng: 0.000002, lat: -0.000001 },
];

export default {
  name: 'project-map',
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPolygon,
    LCircle,
    LTooltip,
    LLayerGroup,
    LControl,
  },
  props: {
    activeCameraId: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      zoom: defaultZoom.byStudyArea,
      getForestBoundaryParam: defaultPosition,
      options: {
        zoomControl: true,
      },
      url: 'https://{s}.tile.osm.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
      studyAreaRadius: 10000,
      cameraRadius: 5000,
      markerColor: {
        area: 'rgb(42, 127, 96)',
        camera: 'rgb(17, 138, 178)',
      },
      showForestBoundary: false,
      showSpecies: false,
      displaySpeciesDate: 0,
      displayCurrentDate: {
        x: 0,
        show: false,
      },
    };
  },
  watch: {
    mapMode(value) {
      this.zoom = defaultZoom[value];
    },
    showForestBoundary() {
      this.reloadForestBoundary();
    },
  },
  computed: {
    ...studyAreas.mapGetters([
      'studyAreas',
      'cameraLocations',
      'speciesGroupStartDate',
      'speciesGroupEndDate',
      'topFiveSpecies',
      'getSpeciesGroups',
    ]),
    ...forest.mapGetters(['forestBoundary']),
    projectId: function() {
      return this.$route.params.projectId;
    },
    selectedStudyAreaId: function() {
      return this.$route.params.selectedStudyAreaId;
    },
    selectedCameraId: function() {
      return this.$route.params.selectedCameraId;
    },
    mapMode: function() {
      if (this.selectedStudyAreaId === 'all') {
        return 'byStudyArea';
      }
      return 'byCameraLocation';
    },
    areas: function() {
      return this.studyAreas
        .filter(({ position }) => position.lat && position.lng)
        .map(({ title, id, children, position }) => ({
          title,
          position,
          path: idx(children, _ => _[0].id) || id, // if area have children, use first child id as path
        }));
    },
    cameras: function() {
      return this.cameraLocations.map(
        ({ id, name, latitude, longitude, failures }) => ({
          id,
          name,
          position: {
            lat: latitude,
            lng: longitude,
          },
          icon: this.getMarkerIcon(id, failures),
        }),
      );
    },
    speciesGroups: function() {
      return this.getSpeciesGroups({
        type: this.mapMode,
        date: this.currentDisplayDate,
      });
    },
    speciesLegend: function() {
      return Object.entries(this.topFiveSpecies).map(([id, name], index) => ({
        id,
        name,
        color: chartColors[index],
      }));
    },
    speciesMaxRecords: function() {
      return Object.values(this.speciesGroups)
        .reduce((join, speciesData) => [...join, ...speciesData], [])
        .reduce(
          (max, { numberOfRecords }) => Math.max(max, numberOfRecords),
          0,
        );
    },
    speciesMarkers: function() {
      if (this.mapMode === 'byStudyArea') {
        return this.studyAreas.reduce((res, { position, id }) => {
          const markers = (this.speciesGroups[id] || []).map(
            ({ speciesId, numberOfRecords }, index) => ({
              speciesId,
              color: this.getSpeciesMarkerColor(speciesId),
              radius: (numberOfRecords / this.speciesMaxRecords) * 2000 + 200, // limit radius between 200 ~ 2200
              position: this.getRandomPosition(
                position,
                index,
                this.studyAreaRadius,
              ),
            }),
          );
          return [...res, ...markers];
        }, []);
      }
      return this.cameras.reduce((res, { position, id }) => {
        const markers = (this.speciesGroups[id] || []).map(
          ({ speciesId, numberOfRecords }, index) => ({
            speciesId,
            color: this.getSpeciesMarkerColor(speciesId),
            radius: (numberOfRecords / this.speciesMaxRecords) * 1000 + 100, // limit radius between 100 ~ 1100
            position: this.getRandomPosition(
              position,
              index,
              this.cameraRadius,
            ),
          }),
        );
        return [...res, ...markers];
      }, []);
    },
    mapCenter: function() {
      // project level: calculate center base on all parent studyAreas
      if (this.selectedStudyAreaId === 'all') {
        return this.areas
          .filter(({ position }) => position.lat && position.lng)
          .reduce(
            (res, { position }) => {
              const { lat, lng } = position;
              res.lat += lat / this.areas.length;
              res.lng += lng / this.areas.length;
              return res;
            },
            {
              lat: 0,
              lng: 0,
            },
          );
      }
      if (!this.selectedCameraId) {
        // studyArea level: calculate center base on all cameraLocation in this studyArea
        return this.cameras.reduce(
          (res, { position }) => {
            const { lat, lng } = position;
            res.lat += lat / this.cameras.length;
            res.lng += lng / this.cameras.length;
            return res;
          },
          {
            lat: 0,
            lng: 0,
          },
        );
      }
      // camera level: use current cameraLocation
      const { position } = this.cameras.find(
        ({ id }) => id === this.selectedCameraId,
      ) || { position: defaultPosition };

      return {
        lat: position.lat,
        lng: position.lng,
      };
    },
    startDisplayYear: function() {
      return parseInt(this.speciesGroupStartDate.slice(0, 4), 10);
    },
    startDisplayMonth: function() {
      return parseInt(this.speciesGroupStartDate.slice(5), 10);
    },
    endDisplayYear: function() {
      return parseInt(this.speciesGroupEndDate.slice(0, 4), 10);
    },
    endDisplayMonth: function() {
      return parseInt(this.speciesGroupEndDate.slice(5), 10);
    },
    totalDisplayMonth: function() {
      return (
        (this.endDisplayYear - this.startDisplayYear) * 12 +
        (this.endDisplayMonth - this.startDisplayMonth) +
        1
      );
    },
    currentDisplayDate: function() {
      // transfer slider number to date
      const num = parseInt(this.displaySpeciesDate, 10);
      const totalMonth = this.startDisplayMonth + num;
      const year = this.startDisplayYear + Math.floor((totalMonth - 1) / 12);
      const month = totalMonth % 12 === 0 ? 12 : totalMonth % 12;

      return `${year}-${setTwoDigitFormat(month)}`;
    },
  },
  methods: {
    ...forest.mapActions(['loadForestBoundary']),
    getMarkerIcon: function(id, failures) {
      if (failures > 0) {
        if (id === this.activeCameraId) {
          return ErrorCameraIconSelect;
        }
        return ErrorCameraIcon;
      }
      if (id === this.activeCameraId) {
        return CameraIconSelect;
      }
      return CameraIcon;
    },
    zoomUpdated(e) {
      this.zoom = e;
    },
    selectArea(path) {
      this.$router.push({
        name: 'projectMedia',
        params: {
          projectId: this.projectId,
          selectedStudyAreaId: path,
          type: 'retrieved',
        },
      });
    },
    selectCamera(cameraId) {
      this.$router.push({
        name: 'projectMedia',
        params: {
          projectId: this.projectId,
          selectedStudyAreaId: this.selectedStudyAreaId,
          type: 'retrieved',
          selectedCameraId: cameraId,
        },
      });
    },
    reloadForestBoundary(position) {
      if (!this.showForestBoundary) return;
      if (this.zoom < defaultZoom.area) return;

      const { lat, lng } = position || this.mapCenter;
      const { lat: qLat, lng: qLng } = this.getForestBoundaryParam;
      if (Math.abs(lat - qLat) < 0.05 || Math.abs(lng - qLng) < 0.05) return;

      this.getForestBoundaryParam = { lat, lng };
      this.loadForestBoundary({ lat, lng });
    },
    centerUpdated({ lat, lng }) {
      this.reloadForestBoundary({ lat, lng });
    },
    mousedownSlider(e) {
      this.displayCurrentDate = {
        show: true,
        x: e.layerX,
      };
    },
    mousemoveSlider(e) {
      const { target, layerX } = e;
      if (
        this.displayCurrentDate.show &&
        layerX >= 0 &&
        layerX <= target.clientWidth
      ) {
        this.displayCurrentDate.x = layerX;
      }
    },
    mouseupSlider() {
      this.displayCurrentDate.show = false;
    },
    getRandomPosition({ lat, lng }, idx, scale) {
      return {
        lat: lat + positonShift[idx].lat * scale,
        lng: lng + positonShift[idx].lng * scale,
      };
    },
    getSpeciesMarkerColor(speciesId) {
      if (!this.speciesLegend) return '';
      const species = this.speciesLegend.find(({ id }) => id === speciesId);

      return (species && species.color) || '';
    },
  },
};
</script>
<style lang="scss" scoped>
.checkbox__container {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;

  & > div {
    position: relative;

    & > label {
      padding-left: 25px;
      font-size: 14px;
    }
  }
}

.range__container {
  position: relative;

  & > input {
    width: 100%;

    &:disabled {
      cursor: not-allowed;
    }
  }

  .range__current {
    position: absolute;
    top: -28px;
    left: 0;
    padding: 5px 10px;
    border-radius: 3px;
    width: 80px;
    transform: translateX(-40px);
    background-color: white;
    color: #8b8b8b;
    box-shadow: 0px 0px 2px 0px black;
  }

  .range__display {
    display: flex;
    justify-content: space-between;
    color: #8b8b8b;
  }
}

.species__legend > div {
  position: relative;

  & > span {
    display: block;
    position: absolute;
    top: 4px;
    left: -12px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid white;
  }
}
</style>
