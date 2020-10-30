<template>
  <div class="action">
    <div v-if="status === 200" class="success">
      <span></span>
    </div>
    <div>
      <div class="btn btn-default" @click="$emit('cancel')">
        {{ cancelBtnContext }}
      </div>

      <button
        type="submit"
        class="btn btn-orange"
        @click.stop.prevent="handler"
        :disabled="!!disabledSubmit"
      >
        {{ submitBtnContext }}
      </button>
    </div>
  </div>
</template>

<script>
import getResponseMessage from '@/utils/responseMessage';

export default {
  name: 'ActionBtns',
  props: {
    cancelBtnContext: {
      type: String,
      default: '取消',
    },
    submitBtnContext: {
      type: String,
      default: '儲存設定',
    },
    response: {
      type: Object,
      default: undefined,
    },
    disabledSubmit: {
      type: Boolean,
      default: true,
    },
    status: {
      type: Number,
      default: 200,
    },
  },
  methods: {
    responseMessage: function() {
      if (this.response) {
        return getResponseMessage(this.response.status);
      }
    },
    handleClick: function() {
      this.$emit('submit');
    },
    responsing: function() {
      console.log(this.status);
      if (this.status == 200) {
        alert('設定已儲存');
      } else if (this.status == 0) {
        alert('請檢查是否填寫正確');
      } else {
        alert('設定未完全');
      }
    },
    handler: function() {
      this.handleClick();
      this.responsing();
      this.$emit('handler', this.status);
    },
  },
};
</script>

<style lang="scss" scoped>
.action {
  display: flex;
  justify-content: space-between;

  & > .error > span {
    color: #d80c37;
  }
  & > .success > span {
    color: #2a7f60;
  }
}
</style>
