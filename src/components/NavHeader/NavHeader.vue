<template>
  <header>
    <nav class="navbar navbar-expand-sm">
      <router-link to="/" role="button" class="navbar-brand"
        >Camara Capture</router-link
      >
      <button
        v-if="!isLogin"
        class="navbar-toggler collapsed"
        type="button"
        data-toggle="collapse"
        data-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div
        v-if="!isLogin"
        class="collapse navbar-collapse justify-content-end"
        id="navbarSupportedContent"
      >
        <div class="navbar-nav justify-content-md-end subnav">
          <div class="nav-item dropdown help">
            <a
              class="nav-link dropdown-toggle"
              role="button"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
              >幫助</a
            >
            <div class="dropdown-menu dropdown-menu-right">
              <router-link to="/help/faq" class="dropdown-item"
                >常見問題</router-link
              >
              <router-link to="/help/contact-us" class="dropdown-item"
                >聯絡我們</router-link
              >
              <router-link to="/help/privacy" class="dropdown-item"
                >隱私權政策</router-link
              >
            </div>
          </div>
          <div class="divider"></div>
          <div class="nav-item ml-3">
            <a @click="loginModalOpen = true" class="btn btn-orange">登入</a>
          </div>
        </div>
      </div>
      <div class="collapse navbar-collapse" v-if="isLogin">
        <ul class="navbar-nav main-nav">
          <li class="nav-item">
            <router-link
              class="nav-link"
              :class="isProjectPath ? 'active' : ''"
              role="button"
              to="/project/overview"
              >計畫總覽
              <span class="sr-only" v-if="isProjectPath">(current)</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              class="nav-link"
              :class="isDownloadPath ? 'active' : ''"
              role="button"
              to="/download/search"
              >篩選及下載
              <span class="sr-only" v-if="isDownloadPath">(current)</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              class="nav-link"
              :class="isHistoryPath ? 'active' : ''"
              role="button"
              to="/upload-history"
              >上傳紀錄
              <span class="sr-only" v-if="isHistoryPath">(current)</span>
            </router-link>
          </li>
          <li class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              role="button"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
              >幫助</a
            >
            <div class="dropdown-menu dropdown-menu-right">
              <router-link to="/help/faq" class="dropdown-item"
                >常見問題</router-link
              >
              <router-link to="/help/contact-us" class="dropdown-item"
                >聯絡我們</router-link
              >
              <router-link to="/help/privacy" class="dropdown-item"
                >隱私權政策</router-link
              >
            </div>
          </li>
          <li class="divider"></li>
        </ul>
        <div class="navbar-nav subnav">
          <div v-if="haveNotification" class="divider"></div>
          <div v-if="haveNotification" class="nav-item dropdown notification">
            <a
              class="nav-item nav-link dropdown-toggle"
              id="notification"
              role="button"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <i class="fa fa-bell"></i>
            </a>
            <div
              id="notification-container"
              class="dropdown-menu dropdown-menu-right"
              aria-labelledby="notification"
            >
              <a
                class="dropdown-item notification-item"
                v-for="(msg, mid) in notifications"
                :key="`log-msg-${mid}`"
              >
                <div v-if="msg.collection == 'UploadSession'">
                  <div class="meta text-gray date">
                    {{ formattedDateTime(msg.modified) }} 您上傳了
                  </div>
                  <h5 class="text-green">
                    <a href="#" class="link">
                      <!-- {{msg.projectTitle}} {{msg.site}}-{{msg.subSite}} {{msg.cameraLocation}}<br /> {{msg.earliestDataDate}}-{{msg.latestDataDate}} -->
                      <span v-html="msg.message"></span>
                    </a>
                  </h5>
                  <div class="meta" v-if="msg.status == 'ERROR'">
                    上傳內容可能有誤
                    <!-- a class="text-green link">檢視錯誤</a -->
                  </div>
                  <div class="meta" v-else>
                    上傳成功
                  </div>
                </div>
                <div v-if="msg.collection == 'AbnormalData'">
                  <div class="meta text-gray date">
                    {{ formattedDateTime(msg.modified) }}
                  </div>
                  <h5 class="text-green">
                    <a href="#" class="link">
                      <span v-html="msg.message"></span>
                    </a>
                  </h5>
                </div>
                <div v-if="msg.collection == 'UserReport'">
                  <div class="meta text-gray date">
                    {{ formattedDateTime(msg.modified) }}
                  </div>
                  <h5 class="text-green">
                    <a href="#" class="link">
                      <span v-html="msg.message"></span>
                    </a>
                  </h5>
                </div>
                <div v-if="msg.collection == 'Announcement'">
                  <div class="meta text-gray date">
                    {{ formattedDateTime(msg.modified) }}
                  </div>
                  <h5 class="text-green">
                    <a href="#" class="link">
                      <span v-html="msg.message"></span>
                    </a>
                  </h5>
                </div>
              </a>
            </div>
          </div>
          <div class="divider"></div>
          <div class="nav-item dropdown">
            <a
              class="nav-item nav-link dropdown-toggle"
              id="navbarDropdownMenuLink"
              role="button"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              {{ userName }}
            </a>
            <div
              class="dropdown-menu dropdown-menu-right"
              aria-labelledby="navbarDropdownMenuLink"
            >
              <router-link class="dropdown-item" to="/setting"
                >設定</router-link
              >
              <a class="dropdown-item" href="#" @click="doLogout()">登出</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <login-modal :open="loginModalOpen" @close="loginModalOpen = false" />
  </header>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';

import moment from 'moment';

import LoginModal from '@/components/Modal/LoginModal';

const account = createNamespacedHelpers('account');
// const message = createNamespacedHelpers('message');

export default {
  name: 'NavHeader',
  props: {
    isLogin: {
      type: Boolean,
      default: false,
    },
  },
  components: { LoginModal },
  data() {
    return {
      loginModalOpen: false,
      pathname: this.$route.name,
      notifications: [
        {
          collection: 'test',
        },
      ],
    };
  },
  computed: {
    ...account.mapGetters(['userName']),
    // ...message.mapGetters(['notifications']),
    isProjectPath: function() {
      return this.$route && /^\/project/.test(this.$route.path);
    },
    isDownloadPath: function() {
      return this.$route && /^\/download/.test(this.$route.path);
    },
    isHistoryPath: function() {
      return this.$route && /^\/upload-history/.test(this.$route.path);
    },
    haveNotification: function() {
      /*
      Return true when there are any notifications that are not "Announcement".
      @returns {bool}
       */
      if (!this.notifications) {
        return false;
      }
      for (let index = 0; index < this.notifications.length; index += 1) {
        if (this.notifications[index].collection !== 'Announcement') {
          return true;
        }
      }
      return false;
    },
  },
  methods: {
    ...account.mapActions(['doLogout']),
    // ...message.mapActions(['loadNotifications']),
    formattedDateTime: function(timestamp) {
      return moment(timestamp * 1000).format('YYYY-MM-DD hh:mm:ss');
    },
  },
};
</script>
<style lang="scss">
header {
  position: fixed;
  top: 0;
  left: 0;
}
</style>