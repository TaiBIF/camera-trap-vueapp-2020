<template>
  <div class="sheet">
    <!-- header -->
    <div class="sheet-header">
      <div class="row">
        <div class="col-10 no-padding-right">
          <small class="text-gray">共 {{ annotationsTotal }} 筆資料</small>
          <div class="divider"></div>
          <continuous-button
            v-if="isEdit"
            :isEnable="isEnableContinuous"
            :continuousMinute="continuousMinute"
            @switch="isEnableContinuous = !isEnableContinuous"
            @change="continuousMinute = $event"
          />
        </div>

        <div class="col-2 text-right no-padding-left">
          <a
            class="btn btn-icon"
            v-tooltip.top="'影像檢視'"
            :class="{ active: galleryShow }"
            @click="$emit('galleryShow', !galleryShow)"
          >
            <i class="icon-gallery"></i>
          </a>
          <div class="divider"></div>
          <a
            class="btn btn-icon"
            v-tooltip.top="'版本紀錄'"
            :class="{ active: historyShow }"
            @click="$emit('historyShow', !historyShow)"
          >
            <i class="icon-time-machine"></i>
          </a>
        </div>

        <div v-if="showErrorMessage && !!errorMessage" class="error-message">
          <a class="close" @click="showErrorMessage = false">
            <i class="fa fa-times"></i>
          </a>
          <span class="alert-box"></span>
          <span class="text" v-html="errorMessage"> </span>
        </div>
      </div>
    </div>
    <!-- handsontable -->
    <hot-table
      ref="sheet"
      id="sheet"
      licenseKey="non-commercial-and-evaluation"
      language="zh-TW"
      :settings="HandsontableSetting"
    />
    <!-- Pagination -->
    <div class="sheet-footer">
      <div class="float-left">
        <small class="text-gray">單頁顯示</small>
        <small class="select">
          <select
            name=""
            id=""
            class="form-control"
            v-model="pageSize"
            :style="{ padding: '0px 5px' }"
          >
            <option :key="opt" :value="opt" v-for="opt in [10, 50, 100, 500]">{{
              opt
            }}</option>
          </select>
        </small>
        <small class="text-gray">筆資料，您正在檢視：</small>
      </div>
      <span>{{
        `第 ${Math.min(currentDataRange.begin, currentDataRange.end)} - ${
          currentDataRange.end
        } 筆`
      }}</span>
      <div class="float-right">
        <div class="input-group pager">
          <div class="input-group-prepend">
            <button @click="currentPage--" :disabled="currentPage === 1">
              <i class="fa fa-caret-left"></i>
            </button>
          </div>
          <input
            disabled
            type="text"
            class="form-control"
            :value="`${Math.min(currentPage, totalPage)}/${totalPage}`"
          />
          <div class="input-group-append">
            <button
              @click="currentPage++"
              :disabled="currentPage + 1 > totalPage"
            >
              <i class="fa fa-caret-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <info-modal :open="showIdleModal" @close="showIdleModal = false">
      <p class="text-gray">
        您已閒置30分鐘，系統已自動跳出編輯模式。
      </p>
    </info-modal>
  </div>
</template>

<script>
import { HotTable } from '@handsontable/vue';
import { createNamespacedHelpers } from 'vuex';
import idx from 'idx';
import moment from 'moment';
import * as R from 'ramda';

import { dateFormatYYYYMMDDHHmmss } from '@/utils/dateHelper.js';
import { getLanguage } from '@/utils/i18n';
import ContinuousButton from '@/components/ProjectStudyAreas/ContinuousButton';
import InfoModal from '@/components/Modal/InfoModal.vue';
import SpeciesTooltip, { failures } from '@/constant/SpeciesTooltip.js';

const annotations = createNamespacedHelpers('annotations');
const projects = createNamespacedHelpers('projects');
const dataFields = createNamespacedHelpers('dataFields');
const studyAreas = createNamespacedHelpers('studyAreas');
const account = createNamespacedHelpers('account');

const resetTd = td => {
  td.innerHTML = '';
  delete td.dataset.tooltip;
  td.className = '';
};

const isHiddenContinuousMenu = (selected, recover, respectRecoverType) => {
  const row = selected[0][0];

  return (
    selected.length !== 1 || // 選擇多格 or 同時選擇多個範圍(例如拖拉範圍選擇)
    selected[0][0] !== selected[0][2] || // 這兩種情況表示選取不只一格
    idx(recover, _ => _[row].newVal) === undefined || // 還沒有連拍編輯過
    recover[row].isRecover === respectRecoverType // 判斷是否符合預期
  );
};

export default {
  components: {
    HotTable,
    ContinuousButton,
    InfoModal,
  },
  props: {
    isEdit: {
      type: Boolean,
      required: true,
    },
    galleryShow: {
      type: Boolean,
      required: true,
    },
    historyShow: {
      type: Boolean,
      required: true,
    },
    currentAnnotationIdx: {
      type: Number,
      required: true,
    },
  },

  data() {
    return {
      showErrorMessage: true,
      idleTimeevent: -1,
      sheetHeightTimeevent: -1,
      showIdleModal: false,
      isEnableContinuous: false,
      continuousMinute: 3,
      continuousStartRow: undefined,
      //備份連拍編輯資料讓解除連拍可以回覆，主要改變有兩個階段
      //  step1 當連拍範圍改變時，格式如下
      //  {
      //   '9': { // key 為 row
      //     row: 9, // row
      //     oldVal: { ...}// 原本的資料用來解除連拍恢復資料用，來源為 his.HandsontableSetting.data
      //   },...
      //  }
      //
      // step2 當連拍編輯之後，會新增 prop, newVal, isRecover
      //  {
      //   '9': {
      //     row: 9,
      //     oldVal: { ...},
      //     prop: 'species', // 所修改的 prop
      //     newVal: '1', // 修改的資料
      //     isRecover: false, // 是否解除連拍過，true 解除過, false 未解除
      //   },
      // }
      continuousRecover: {},
      currentPage: 1, //目前在第幾頁
      pageSize: 50, //一頁顯示的筆數
      currentMouseButton: -1,
      contextMenu: [
        {
          name:
            '<span class="icon"><i class="icon-unlink"></i></span><span class="text">解除連拍連結</span>',
          hidden: (vueInstance =>
            function() {
              return isHiddenContinuousMenu(
                this.getSelected(),
                vueInstance.continuousRecover,
                true, // true 表示已經解除過了，這時候就不能再次解除連結
              );
            })(this),
          callback: (key, selection) => {
            selection.length === 1 &&
              this.continuousRecoverRequest(selection[0].end.row);
          },
        },
        {
          name:
            '<span class="icon"><i class="icon-link"></i></span><span class="text">重新建立連拍連結</span>',
          hidden: (vueInstance =>
            function() {
              return isHiddenContinuousMenu(
                this.getSelected(),
                vueInstance.continuousRecover,
                false, // false 表示還沒解除，這時候就不能重建連拍
              );
            })(this),
          callback: (key, selection) => {
            selection.length === 1 &&
              this.continuousRecoverRequest(selection[0].end.row);
          },
        },
        '---------',
        'cut',
        'copy',
        {
          name: '貼上 請使用鍵盤 ctrl+v 或 cmd+v',
          disabled: true,
        },
        '---------',
        {
          name: '復原',
          disabled: true,
        },
        {
          name: '重做',
          disabled: true,
        },
        '---------',
        {
          name: '複製一列並貼上',
          disabled: function() {
            const selected = this.getSelected();

            // 選擇多格 or 同時選擇多個範圍(例如拖拉範圍選擇)
            // 這兩種情況表示選取不只一格
            return selected.length !== 1 || selected[0][0] !== selected[0][2];
          },
          callback: (key, selection) => {
            this.setIdleTimeout();
            const row = selection[0].start.row;
            this.cloneAnnotations(row);
          },
        },
        {
          name: '刪除列',
          disabled: false,
          callback: (key, selection) => {
            this.setIdleTimeout();
            R.pipe(
              R.map(s => R.range(s.start.row, s.end.row + 1)),
              R.flatten,
              R.uniq,
              R.map(row => this.annotations[row].id),
              this.deleteAnnotations,
            )(selection);
          },
        },
      ],
      HandsontableSetting: {
        height: 500,
        outsideClickDeselects: false,
        rowHeaders: true,
        enterMoves: () => {
          //連拍模式按下 enter 修改不能跳到下一行，不然連拍範圍會被改變
          return { row: this.continuousRange ? 0 : 1, col: 0 };
        },
        colHeaders: [],
        columns: [],
        data: [],
        afterOnCellMouseDown: this.afterOnCellMouseDown,
        afterSelectionEnd: this.afterSelectionEnd,
        afterChange: this.changeAnnotation,
        contextMenu: undefined,
      },
    };
  },
  mounted() {
    setTimeout(() => {
      this.setSheetHeight();
      this.setSheetHeader();
      this.setSheetColumn();
    }, 500);

    this.sheetHeightTimeevent = setInterval(() => {
      this.setSheetHeight(false);
    }, 100);

    // 編輯中離開頁面警告
    window.onbeforeunload = () => {
      return this.isEdit ? '是否要離開此頁面' : undefined;
    };
  },
  beforeDestroy() {
    window.onbeforeunload = null;
    clearTimeout(this.idleTimeevent);
    clearInterval(this.sheetHeightTimeevent);
  },
  watch: {
    continuousRange: function(newVal, oldVal) {
      //console.log({newVal, oldVal});
      if (!R.equals(newVal, oldVal)) {
        this.$refs.sheet.hotInstance.render();
        this.continuousRecover = newVal //continuousRange 不為 undefined 才要備份資料
          ? R.range(newVal[0], newVal[1] + 1).reduce((accumulator, row) => {
              accumulator[row] = {
                row,
                oldVal: R.clone(this.HandsontableSetting.data[row]),
              };
              return accumulator;
            }, {})
          : {};
      }
    },
    isEdit: function(val) {
      this.setSheetHeight();
      this.setSheetColumn();

      if (val === false) {
        this.isEnableContinuous = false;
        this.continuousStartRow = undefined;
        clearTimeout(this.idleTimeevent);
      } else if (val === true) {
        this.setIdleTimeout();
      }

      this.HandsontableSetting.contextMenu =
        val === true ? this.contextMenu : undefined;
    },
    currentPage: function() {
      this.$emit('changePage', {
        currentPage: this.currentPage,
        pageSize: this.pageSize,
      });
      this.continuousStartRow = undefined;
    },
    pageSize: function() {
      this.currentPage = 1;
      this.$emit('changePage', {
        currentPage: this.currentPage,
        pageSize: this.pageSize,
      });
    },
    annotations: function(val) {
      this.HandsontableSetting.data = val.map(v => ({
        id: v.id,
        studyArea: v.studyArea,
        cameraLocation: v.cameraLocation,
        filename: v.filename,
        time: v.time,
        species: v.species.title,
        ...v.fields.reduce((pre, current) => {
          pre[current.dataField] = current.value;
          return pre;
        }, {}),
      }));
    },
    currentAnnotationIdx: function(val) {
      // 改變時要修改選擇 row，例如右側影像檢視切換成下一張時
      const { hotInstance } = this.$refs.sheet;
      const selected = hotInstance.getSelected();

      // 如果外部設定的不是目前表單所選擇的則要改變選擇的 row
      if (!!selected && selected[0][2] !== val) {
        hotInstance.selectRows(val);
      }

      this.showErrorMessage = true;
    },
    projectDataFields: function() {
      this.setSheetHeader();
      this.setSheetColumn();
    },
  },
  computed: {
    ...annotations.mapState(['annotationsTotal']),
    ...annotations.mapGetters(['annotations']),
    ...dataFields.mapGetters(['dataFields']),
    ...projects.mapGetters([
      'projectDataFields',
      'projectSpecies',
      'isProjectManager',
    ]),
    ...account.mapGetters(['userId', 'isAdministrator']),
    ...studyAreas.mapState(['cameraLocations']),
    ...studyAreas.mapGetters(['studyAreaTitle']),
    //計算目前筆數範圍
    currentDataRange() {
      const { currentPage, pageSize, annotationsTotal } = this;
      return {
        begin: (currentPage - 1) * pageSize + 1,
        end: Math.min(currentPage * pageSize, annotationsTotal),
      };
    },
    //計算最多總頁數
    totalPage() {
      return Math.ceil(this.annotationsTotal / this.pageSize);
    },
    //能否新增欄位
    canRequestNewDataFields() {
      return this.isAdministrator || this.isProjectManager(this.userId);
    },
    continuousRange() {
      if (
        this.isEnableContinuous === false ||
        this.continuousStartRow === undefined
      ) {
        return undefined;
      }

      const endTime = moment(
        this.HandsontableSetting.data[this.continuousStartRow].time,
      ).add(this.continuousMinute, 'minutes');

      const targetIndex = this.HandsontableSetting.data
        .map(v => v.time)
        .slice(this.continuousStartRow)
        .findIndex(v => moment(v).isAfter(endTime));

      const endIndex =
        targetIndex === -1 // -1 表示到最後一個都在範圍內
          ? this.HandsontableSetting.data.length - 1
          : this.continuousStartRow + targetIndex - 1;

      return [this.continuousStartRow, endIndex];
    },
    errorMessage() {
      if (this.currentAnnotationIdx < 0) {
        return '';
      }

      let message = '';

      this.annotations[this.currentAnnotationIdx].failures.forEach(key => {
        if (failures[key]) {
          message = failures[key];
        }
      });

      return message;
    },
  },
  methods: {
    ...annotations.mapActions([
      'setAnnotations',
      'deleteAnnotations',
      'cloneAnnotations',
    ]),
    resetPagination(page = 0) {
      this.currentPage = page + 1;
    },
    setIdleTimeout() {
      clearTimeout(this.idleTimeevent);
      this.idleTimeevent = setTimeout(() => {
        this.$emit('closeEdit');
        this.showIdleModal = true;
      }, 1000 * 60 * 30); // 30 分鐘
    },
    setSheetHeight(isForce = true) {
      const sheetHeight =
        window.innerHeight -
        document.querySelector('header').clientHeight -
        document.querySelector('.search-container').clientHeight -
        document.querySelector('.sheet-footer').clientHeight -
        document.querySelector('.sheet-header').clientHeight;

      if (isForce === true || this.HandsontableSetting.height !== sheetHeight) {
        this.HandsontableSetting.height = sheetHeight;
        this.$nextTick(() => {
          this.$refs.sheet.hotInstance.render();
        });
      }
    },
    afterOnCellMouseDown(event) {
      this.currentMouseButton = event.button;
    },
    afterSelectionEnd(row, column, row2) {
      // 0: Main button pressed, usually the left button or the un-initialized state
      // 2: Secondary button pressed, usually the right button
      if (this.currentMouseButton === 0) {
        // 左鍵才要重新計算連拍範圍，右鍵有可能是要解除連拍
        this.continuousStartRow = row2;
      }

      this.changeAnnotationIdx(row, column, row2);
    },
    changeAnnotationIdx(row, column, row2) {
      if (R.isNil(row2) === false) {
        //在表單尚未有資料前點 header 時 row2 會是 null
        this.$emit('currentAnnotationIdx', row2);
      }
    },
    setSpeciesTooltip(instance, td, row, col, prop, title) {
      resetTd(td); // td 會共用，所以每次都要重置

      if (title) {
        // sp 有多種取得來源
        // 1. 一般呈現使用 annotations
        // 2. 如果有編輯則使用 projectSpecies
        // 3. 使用者自己輸入的物種名稱，全新不存在於計畫預設物種
        const sp = this.annotations[row].species.title
          ? this.annotations[row].species // #1 來源
          : R.find(R.propEq('title', title), this.projectSpecies); // #2 來源

        // 不明原因有時後 sp.title 會與 title 值不相同，造成資料還是顯示舊的 issue #125
        if (sp && sp.title === title) {
          // 如果 sp 存在才要用一般方式判斷
          td.innerHTML = `<span class="text">${sp.title}</span>`;

          if (sp.code) {
            // 如果有 code 則要顯示物種提示
            td.dataset.tooltip = SpeciesTooltip[sp.code];
          } else if (this.annotations[row].failures.length > 0) {
            td.innerHTML += '<span class="alert-box">!</span>';
            td.className = 'htInvalid';
          }
        } else {
          // 如果 sp 不存在則表示是 #3 來源，則不須任何判斷直接顯示物種 title
          td.innerHTML = title;
        }
      }

      return td;
    },
    setTimeTooltip(instance, td, row, col, prop, changeTime) {
      resetTd(td); // td 會共用，所以每次都要重置

      if (changeTime) {
        // 1. 一般呈現使用 annotations
        const tt = this.annotations[row].changeTime;
        td.innerHTML = `<span class="text">${tt}</span>`;
      }
      //console.log(td);
      return td;
    },
    // 除了必填的 header 以外還會有其他不同的自定義欄位
    setSheetHeader() {
      this.HandsontableSetting.colHeaders = [
        ...this.projectDataFields.map(v => v.title),
      ];
      this.canRequestNewDataFields &&
        this.HandsontableSetting.colHeaders.push(
          `<a
            href="/project/${this.$route.params.projectId}/edit/setting"
            style="color: #999;
        "> <i class="fas fa-plus"></i> </a>`,
        );
    },
    // 設定每個 column 要如何顯示
    setSheetColumn() {
      const defaultColumn = [
        {
          data: 'studyArea',
          readOnly: true,
          renderer: (instance, td, row, col, prop, value) => {
            td.innerHTML = this.studyAreaTitle(value);
            return td;
          },
        },
        {
          data: 'cameraLocation',
          readOnly: true,
          renderer: (instance, td, row, col, prop, value) => {
            td.innerHTML = R.find(
              R.propEq('id', value),
              this.cameraLocations,
            ).name;
            return td;
          },
        },
        {
          data: 'filename',
          readOnly: true,
          renderer: (instance, td, row, col, prop, value) => {
            resetTd(td);

            td.innerHTML = `<div class="text">${value}</div>`;
            if (!this.annotations[row].file) {
              td.innerHTML += '<div class="alert-box">!</div>';
              td.className = 'htFileInvalid';
            }
            return td;
          },
        },
        {
          data: 'time',
          readOnly: !this.isEdit,
          renderer: (instance, td, row, col, prop, value) => {
            resetTd(td);

            let className = [];
            if (
              this.continuousRange &&
              row >= this.continuousRange[0] &&
              row <= this.continuousRange[1]
            ) {
              className.push('is-continuoust');

              if (row === this.continuousRange[0]) {
                td.dataset.tooltip = '連拍';
                className.push('is-continuous-start');
              }

              if (row === this.continuousRange[1]) {
                className.push('is-continuous-end');
              }

              if (idx(this.continuousRecover, _ => _[row].isRecover) === true) {
                className.push('is-continuous-apart');
              } else {
                className.push('period-x');
              }
            }

            td.innerHTML = dateFormatYYYYMMDDHHmmss(value);
            td.className = className.join(' ');
            return td;
          },
        },
        {
          data: 'species',
          readOnly: !this.isEdit,
          renderer: this.setSpeciesTooltip,
          ...(this.isEdit
            ? {
                type: 'autocomplete',
                source: this.projectSpecies.map(({ title }) => title),
                strict: false,
                trimDropdown: false,
              }
            : {}),
        },
      ];

      const CustomizationColumn = this.projectDataFields
        .slice(defaultColumn.length)
        .map(v => {
          let obj = {};
          switch (v.widgetType) {
            case 'text':
              obj = {
                renderer: (instance, td, row, col, prop, value) => {
                  td.innerHTML = value || '';
                  return td;
                },
              };
              break;
            case 'time':
              obj = {
                renderer: (instance, td, row, col, prop, value) => {
                  td.innerHTML = value ? dateFormatYYYYMMDDHHmmss(value) : '';
                  return td;
                },
              };
              break;
            case 'select':
              obj = {
                editor: 'select',
                selectOptions: v.options.reduce((accumulator, v) => {
                  accumulator[v.id] = v[getLanguage()];
                  return accumulator;
                }, {}),
                renderer: (instance, td, row, col, prop, value) => {
                  resetTd(td);

                  td.innerHTML = R.pipe(
                    R.find(R.propEq('id', value)),
                    R.ifElse(R.isNil, R.always(''), v => v[getLanguage()]),
                  )(v.options);

                  return td;
                },
              };
              break;
          }
          return {
            data: v.id,
            readOnly: !this.isEdit,
            ...obj,
          };
        });

      this.HandsontableSetting.columns = [
        ...defaultColumn,
        ...CustomizationColumn,
      ];
      this.canRequestNewDataFields &&
        this.HandsontableSetting.columns.push({
          // workaround
          // 因為 handsontable 不能只加 header 沒有 column
          // 為了要顯示 `+` 功能所以補上隱藏 column
          readOnly: true,
          renderer: (instance, td) => {
            td.setAttribute('style', 'display:none;');
            return td;
          },
        });
    },
    changeAnnotation(changes) {
      if (!!changes && this.isEdit === true) {
        // 如果修改同一個 row 不同的 column 在 changes 會是多筆資料，這樣送出 api 會有錯誤
        // 所以需要將同 row 多筆資料合併成一筆
        const newChanges = changes.reduce(
          (accumulator, { 0: row, 1: prop, 3: newVal }) => {
            accumulator[row] = R.defaultTo([], accumulator[row]);
            accumulator[row].push({ prop, newVal });
            return accumulator;
          },
          {},
        );
        Object.entries(newChanges).forEach(([row, change]) => {
          if (
            this.continuousRange &&
            changes.length === 1 &&
            row === this.continuousRange[0] + ''
          ) {
            R.range(this.continuousRange[0], this.continuousRange[1] + 1).map(
              v => {
                this.continuousRecover[v] = {
                  ...this.continuousRecover[v],
                  prop: change[0].prop,
                  newVal: change[0].newVal,
                  isRecover: false,
                };
                this.changeRequest(v, change);
              },
            );
          } else {
            this.changeRequest(row, change);
          }
        });
      }
    },
    continuousRecoverRequest(row) {
      const recover = this.continuousRecover[row];

      this.changeRequest(row, [
        {
          prop: recover.prop,
          newVal: recover.isRecover
            ? recover.newVal
            : recover.oldVal[recover.prop],
        },
      ]);
      this.continuousRecover[row].isRecover = !recover.isRecover;
    },
    changeRequest(row, change) {
      this.setIdleTimeout();
      let annotation = {
        fields: R.clone(this.annotations[row].fields),
        speciesTitle: this.annotations[row].species.title,
        changeTime: this.annotations[row].time,
      };
      change.forEach(({ prop, newVal }) => {
        if (prop === 'species') {
          annotation.speciesTitle = newVal;
        } else if (prop === 'time') {
          annotation.changeTime = newVal;
        } else {
          if (prop !== 'species' && prop !== 'time') {
            const targetIdx = R.findIndex(R.propEq('dataField', prop))(
              annotation.fields,
            );
            if (targetIdx === -1) {
              // 不存在就新增
              annotation.fields.push({
                dataField: prop,
                value: newVal,
              });
            } else {
              // 存在則修改
              annotation.fields[targetIdx].value = newVal;
            }
          }
        }
      });
      // fields 內的資料如果 value 不存在要過濾，不然後端會錯誤
      annotation.fields = annotation.fields.filter(v => !!v.value);
      this.setAnnotations({
        annotationId: this.annotations[row].id,
        body: annotation,
      });
    },
  },
};
</script>

<style lang="scss">
.handsontable {
  td.htFileInvalid {
    overflow: visible;
    background: transparentize(#dbc451, 0.9);
    padding-left: 16px;

    .alert-box {
      background: #fbd485;
    }
  }

  .text {
    position: relative;
    white-space: nowrap;
  }
}
</style>
