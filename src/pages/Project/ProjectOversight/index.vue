<template>
  <div class="container page-article">
    <router-link :to="`/project/${projectId}`">
      &lt;&lt; {{ projectDetail.title }}
    </router-link>

    <div class="row">
      <div class="col-12">
        <div class="row">
          <div class="col-8">
            <h1 class="heading mt-0">
              相機樣點運作及缺失比例
            </h1>
          </div>
        </div>
        <div class="row">
          <div class="col-3">
            <div class="form-group">
              <label>年份：</label>
              <v-select
                :options="years"
                placeholder="請選擇年份"
                @input="setYear"
                v-model="selectedYear"
              />
            </div>
          </div>
        </div>

        <h3>每月相機運作比例</h3>
        <div
          :key="studyAreaIdx"
          v-for="(studyArea,
          studyAreaIdx) in projectOversight.studyAreaCameraLocations"
        >
          <h4>樣區: {{ studyArea.title }}</h4>
          <div>
            <table class="table table-striped">
              <thead>
                <tr>
                  <td>相機位置</td>
                  <td>1 月</td>
                  <td>2 月</td>
                  <td>3 月</td>
                  <td>4 月</td>
                  <td>5 月</td>
                  <td>6 月</td>
                  <td>7 月</td>
                  <td>8 月</td>
                  <td>9 月</td>
                  <td>10 月</td>
                  <td>11 月</td>
                  <td>12 月</td>
                </tr>
              </thead>
              <tbody
                :key="cameraLocationIdx"
                v-for="(cameraLocation,
                cameraLocationIdx) in studyArea.cameraLocations"
              >
                <tr>
                  <td>{{ cameraLocation.name }}</td>
                  <td
                    :key="i"
                    v-for="(v, i) in projectOversight.data[cameraLocation._id]"
                  >
                    <span
                      v-if="v"
                      v-tooltip.right="{
                        content: `相機有運作天數/當月天數: ${v[0]}/${v[1]}`,
                      }"
                    >
                      {{ renderPercentage(v) }}
                    </span>
                    <span v-else>
                      {{ v }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div :key="i" v-for="(subStudyArea, i) in studyArea.children">
              <h5>子樣區: {{ subStudyArea.title }}</h5>
              <div>
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <td>相機位置</td>
                      <td>1 月</td>
                      <td>2 月</td>
                      <td>3 月</td>
                      <td>4 月</td>
                      <td>5 月</td>
                      <td>6 月</td>
                      <td>7 月</td>
                      <td>8 月</td>
                      <td>9 月</td>
                      <td>10 月</td>
                      <td>11 月</td>
                      <td>12 月</td>
                    </tr>
                  </thead>
                  <tbody
                    :key="cameraLocationIdx"
                    v-for="(cameraLocation,
                    cameraLocationIdx) in subStudyArea.cameraLocations"
                  >
                    <tr>
                      <td>{{ cameraLocation.name }}</td>
                      <td
                        :key="i"
                        v-for="(v, i) in projectOversight.data[
                          cameraLocation._id
                        ]"
                      >
                        <span
                          v-if="v"
                          v-tooltip.right="{
                            content: `相機有運作天數/當月天數: ${v[0]}/${v[1]}`,
                          }"
                        >
                          {{ renderPercentage(v) }}
                        </span>
                        <span v-else>
                          {{ v }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h1>當月相機運作總平均</h1>
          <div>
            <table class="table table-striped">
              <thead>
                <tr>
                  <td>相機位置</td>
                  <td>1 月</td>
                  <td>2 月</td>
                  <td>3 月</td>
                  <td>4 月</td>
                  <td>5 月</td>
                  <td>6 月</td>
                  <td>7 月</td>
                  <td>8 月</td>
                  <td>9 月</td>
                  <td>10 月</td>
                  <td>11 月</td>
                  <td>12 月</td>
                </tr>
              </thead>
              <tbody :key="tt" v-for="tt in projectOversight.Month">
                <tr>
                  <td>全部相機</td>
                  <td>{{ LocNum(tt.Jan) }}</td>
                  <td>{{ LocNum(tt.Feb) }}</td>
                  <td>{{ LocNum(tt.Mar) }}</td>
                  <td>{{ LocNum(tt.Apr) }}</td>
                  <td>{{ LocNum(tt.May) }}</td>
                  <td>{{ LocNum(tt.Jun) }}</td>
                  <td>{{ LocNum(tt.Jul) }}</td>
                  <td>{{ LocNum(tt.Aug) }}</td>
                  <td>{{ LocNum(tt.Sep) }}</td>
                  <td>{{ LocNum(tt.Oct) }}</td>
                  <td>{{ LocNum(tt.Nov) }}</td>
                  <td>{{ LocNum(tt.Dec) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h1>當月缺繳比例</h1>
          <div>
            <table class="table table-striped">
              <thead>
                <tr>
                  <td>相機位置</td>
                  <td>1 月</td>
                  <td>2 月</td>
                  <td>3 月</td>
                  <td>4 月</td>
                  <td>5 月</td>
                  <td>6 月</td>
                  <td>7 月</td>
                  <td>8 月</td>
                  <td>9 月</td>
                  <td>10 月</td>
                  <td>11 月</td>
                  <td>12 月</td>
                </tr>
              </thead>
              <tbody :key="tt" v-for="tt in projectOversight.Month">
                <tr>
                  <td>全部相機</td>
                  <td>{{ LossNum(tt.Jan) }}</td>
                  <td>{{ LossNum(tt.Feb) }}</td>
                  <td>{{ LossNum(tt.Mar) }}</td>
                  <td>{{ LossNum(tt.Apr) }}</td>
                  <td>{{ LossNum(tt.May) }}</td>
                  <td>{{ LossNum(tt.Jun) }}</td>
                  <td>{{ LossNum(tt.Jul) }}</td>
                  <td>{{ LossNum(tt.Aug) }}</td>
                  <td>{{ LossNum(tt.Sep) }}</td>
                  <td>{{ LossNum(tt.Oct) }}</td>
                  <td>{{ LossNum(tt.Nov) }}</td>
                  <td>{{ LossNum(tt.Dec) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="col-12 text-right action">
          <a
            class="btn btn-orange"
            v-tooltip.bottom="'將目前頁面篩選範圍之資料輸出為 xlsx 檔並下載'"
            :href="downloadXlsxSrc"
            target="_blank"
          >
            下載xlsx
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';
import { dateFormatYYYY } from '@/utils/dateHelper';
import vSelect from 'vue-select';

const projects = createNamespacedHelpers('projects');

export default {
  components: {
    vSelect,
  },
  data() {
    return {
      selectedYear: undefined,
    };
  },
  computed: {
    ...projects.mapState(['projectDetail', 'projectOversight']),
    projectId: function() {
      return this.$route.params.projectId;
    },
    years: function() {
      const { annotationDateTimeRange } = this.projectDetail;
      if (annotationDateTimeRange) {
        const start = parseInt(dateFormatYYYY(annotationDateTimeRange[0]), 10);
        const end = parseInt(dateFormatYYYY(annotationDateTimeRange[1]), 10);
        const yearOptions = [];
        for (let i = start; i <= end; i++) {
          yearOptions.push(i);
        }
        return yearOptions;
      }
      return [];
    },
    downloadXlsxSrc() {
      return `${process.env.VUE_APP_API_URL}/api/v1/projects/${
        this.projectId
      }/oversight/index.xlsx?year=${this.selectedYear}`;
    },
  },
  async mounted() {
    console.log(this.projectOversight);
  },
  methods: {
    ...projects.mapActions(['getProjectOversight']),
    async setYear(v) {
      this.getProjectOversight({
        id: this.projectId,
        year: v,
      });
    },
    renderPercentage(v) {
      const d = Math.floor((v[0] / v[1]) * 10000) / 100;
      return `${d}%`;
    },
    LocNum(f) {
      const i = Math.floor(f * 10000) / 100;
      return `${i}%`;
    },
    LossNum(f) {
      const i = Math.floor((100 - Math.floor(f * 10000) / 100) * 10000) / 10000;
      return `${i}%`;
    },
  },
};
</script>
