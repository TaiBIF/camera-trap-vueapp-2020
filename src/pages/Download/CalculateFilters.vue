﻿<template>
  <div class="panel-content">
    <form class="search-columns">
      <div class="row">
        <div class="form-group col-4">
          <label>計算項目</label>
          <v-select
            v-model="type"
            v-on:input="changeType"
            :options="[
              { label: '相機工作時數', value: 'work-hours' },
              { label: '有效照片數', value: 'valid-pics' },
              { label: '目擊事件', value: 'events' },
              { label: 'OI_1', value: 'oi1' },
              { label: 'OI_2', value: 'oi2' },
              { label: 'OI_3', value: 'oi3' },
              { label: '捕獲回合比例', value: 'capture-rate' },
              { label: '偵測到/未偵測到', value: 'detection' },
              { label: '活動機率', value: 'apoa' },
            ]"
          />
        </div>
        <div class="form-group col-4">
          <label>回合長度</label>
          <v-select v-model="rangeType" :options="rangeTypeOptions" />
        </div>
      </div>
      <div class="row">
        <div
          class="form-group col-4"
          v-if="type.value === 'valid-pics' || type.value === 'events'"
        >
          <label>時間判定間隔</label>
          <v-select
            v-model="params.calculateTimeIntervel"
            :options="[
              { label: '2 分鐘', value: 2 * 60 * 1000 },
              { label: '5 分鐘', value: 5 * 60 * 1000 },
              { label: '10 分鐘', value: 10 * 60 * 1000 },
              { label: '30 分鐘', value: 30 * 60 * 1000 },
              { label: '60 分鐘', value: 60 * 60 * 1000 },
            ]"
          />
        </div>
      </div>
      <div class="col-12 text-right action">
        <button
          type="reset"
          class="btn btn-green-border"
          v-on:click="clearCalculateForm"
        >
          清空選項
        </button>
        <button
          type="submit"
          v-on:click.prevent="$emit('calculate', type, rangeType, params)"
          class="btn btn-orange"
        >
          計算
        </button>
      </div>
    </form>
  </div>
</template>
<script>
import vSelect from 'vue-select';

export default {
  data: function() {
    return {
      type: { label: '相機工作時數', value: 'work-hours' },
      rangeType: { label: '選取之時間範圍全部', value: 'all' },
      rangeTypeOptions: [
        { label: '選取之時間範圍全部', value: 'all' },
        { label: '月', value: 'month' },
      ],
      params: {
        calculateTimeIntervel: { label: '2 分鐘', value: 2 * 60 * 1000 },
      },
    };
  },
  components: { vSelect },
  mounted() {},
  methods: {
    clearCalculateForm() {
      this.type = { label: '相機工作時數', value: 'work-hours' };
      this.rangeType = { label: '選取之時間範圍全部', value: 'all' };
    },
    changeType() {
      if (this.type.value === 'detection') {
        this.rangeTypeOptions = [
          { label: '選取之時間範圍全部', value: 'all' },
          { label: '日', value: 'day' },
          { label: '時', value: 'hour' },
        ];
        this.rangeType = { label: '日', value: 'day' };
      } else if (this.type.value === 'apoa') {
        this.rangeTypeOptions = [{ label: '選取之時間範圍全部', value: 'all' }];
        this.rangeType = { label: '選取之時間範圍全部', value: 'all' };
      } else {
        this.rangeTypeOptions = [
          { label: '選取之時間範圍全部', value: 'all' },
          { label: '月', value: 'month' },
        ];
      }
    },
  },
};
</script>
