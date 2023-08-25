<script setup lang="ts">
import { inject, ref, watch } from "vue";
import { useToast } from "primevue/usetoast";
import { useClipboard } from "@vueuse/core";
import { useI18n } from "vue-i18n-lite";
import InputSwitch from 'primevue/inputswitch';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Chips from 'primevue/chips';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const { copy } = useClipboard({ legacy: true });
const toast = useToast();
const route = useRoute();
const inputFilter = ref("");
const currentDomain = `${window.location.protocol}//${window.location.host}`;
const link = ref([
  { name: t("filter.web"), code: "web-filter", url: `${currentDomain}/comment-filter/${route.params.id}?room=${route.query.room}` },
  
]);
const idChanel = ref(route.params.id)
const selectedUrl = ref(link.value[0]);
const comments = ref([] as any []);
const filterByTimeToggle = ref(false);
const rows = ref(10);
const page = ref(1);
const totalComment = ref(0);
const isLoading = ref(false);
const filterLastCommentToggle = ref(false);
const timeFirst = ref();
const timeSecond = ref();
const oldFilter = ref(false)
const pageLucky = inject("pageLucky")
const commentsLucky = inject("commentsLucky")
const pushResultUser = inject("pushResultUser")

const selectOption = ref([
  { name: "10", code: 10 },
  { name: "20", code: 20 },
  { name: "30", code: 30 }
]);

const selectRows = ref(selectOption.value[0]);

watch(selectRows, () => {
  oldFilter.value = true
  rows.value = selectRows.value.code;
  page.value = 1;
  handleFilter()
});

watch(inputFilter, () => {
  defaultFilter.value.keyword = inputFilter.value;
});
const defaultFilter = ref({
  streamId: route.query.room,
  keyword: inputFilter.value,
  perfectMatch: false,
  caseSensitive: false,
  filterLatestComment: [] as any [],
  reacted: false,
  shared: false,
  removeDuplicateComment: false,
  filterByTime: [0, 0]
});

const handleFilter = () => {
  isLoading.value = true;
  defaultFilter.value.keyword = inputFilter.value = inputFilter.value.trim();
  defaultFilter.value.filterLatestComment = defaultFilter.value.filterLatestComment.map((item) => item.trim());

  if (!defaultFilter.value.keyword && (filterLastCommentToggle.value || defaultFilter.value.perfectMatch || defaultFilter.value.caseSensitive)) {
    showError(t("filter.invalid"));
    isLoading.value = false;
    return;
  }
  if ((defaultFilter.value.filterByTime[0] > defaultFilter.value.filterByTime[1]) && filterByTimeToggle.value) {
    showError(t("filter.invalidTime"));
    isLoading.value = false;
    return;
  }
  const searchQuery = (defaultFilter.value.keyword ? `?search=${defaultFilter.value.keyword}` : '')
    fetch("https://stm-server.gstech.space/meiliSearchFilter/" + idChanel.value + searchQuery, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pagePaging: oldFilter.value ? page.value : 1,
        rowsPaging: rows.value,
        streamId: defaultFilter.value.streamId,
        perfectMatch: defaultFilter.value.perfectMatch,
        caseSensitive: defaultFilter.value.caseSensitive,
        filterLatestComment: filterLastCommentToggle.value ? defaultFilter.value.filterLatestComment : [],
        reacted: defaultFilter.value.reacted,
        shared: defaultFilter.value.shared,
        removeDuplicateComment: defaultFilter.value.removeDuplicateComment,
        filterByTime: filterByTimeToggle.value ? defaultFilter.value.filterByTime : [0, 0]
      })
     
    })
    .then((res) => {
      return res.json()
    })
    .then(res => {
      if (res.comments) {
        console.log(res.comments)
        comments.value = res.comments.hits;
        totalComment.value = res.comments.estimatedTotalHits;
        if(!oldFilter.value){
          page.value = 1;
        }
      }
      if(res.success === false) {
        if(res.error.includes("not found")){
          return
        }
        showError(res.message);
      }
    }).catch(e => {console.log(e, "e")})
    .finally(() => {
      oldFilter.value = false
      isLoading.value = false;
    });;

};


const updateTime = (index : any, e : any) => {
  const [hours, minutes] = e.target.value.split(":");
  const now = new Date();
  now.setHours(hours);
  now.setMinutes(minutes);
  if (!index) {
    now.setSeconds(0);
  } else {
    now.setSeconds(59);
  }
  defaultFilter.value.filterByTime[index] = now.getTime();
};

const showError = (details: any) => {
  toast.add({ severity: "error", summary: "Error Message", detail: details, life: 3000 });
};
const showSuccess = () => {
  toast.add({ severity: "success", summary: "Success Message", detail: "Change password successfully", life: 10000 });
};

const nextPage = (params : any) => {
  oldFilter.value = true
  if (params) {
    if ((!!(totalComment.value % rows.value) && page.value === Math.floor(totalComment.value / rows.value) + 1) || (!(totalComment.value % rows.value) && page.value === Math.floor(totalComment.value / rows.value))) {
      return;
    }
    page.value = page.value + 1;
  } else {
    if (page.value === 1) return;
    page.value = page.value - 1;
  }
  handleFilter()
};

watch(filterByTimeToggle, () => {
  if (filterByTimeToggle.value) {
    const currentDate = new Date();
    currentDate.setSeconds(0);
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();
    timeFirst.value = `${currentHour < 10 ? "0" : ""}${currentHour}:${currentMinute < 10 ? "0" : ""}${currentMinute}`;
    timeSecond.value = `${currentHour < 10 ? "0" : ""}${currentHour}:${currentMinute < 10 ? "0" : ""}${currentMinute}`;
    defaultFilter.value.filterByTime[0] = currentDate.getTime();
    defaultFilter.value.filterByTime[1] = currentDate.getTime() + 59999;
  }
});


function removeCommentLucky(){
  for(let i = 0; i < comments.value.length; i++){
      if(comments.value[i].winning){
        delete comments.value[i].winning
        break
      }
    }
}

const createIndexSuccess = ref(false)

const handleCreateMeilisearch = () => {
  console.log(idChanel.value)
 
  fetch("https://stm-server.gstech.space/createIndexesMeiliSearch/" + idChanel.value, {
      method: "POST"
  })
  .then(res => res.json())
  .then(res => {
    if(res.success) {
      createIndexSuccess.value = true
    }
  })
}

</script>
<template>

  <div class="flex flex-column gap-1">
    <Button @click="handleCreateMeilisearch" class="max-w-10rem flex justify-content-center">Tạo meilisearch</Button>
    <p v-show="createIndexSuccess">Create index meilisearch success</p>
    <div class="p-fluid">
      <div class="p-fluid">
        <div class="p-inputgroup flex-1 mb-2">
          <Dropdown v-model="selectedUrl" :options="link" optionLabel="name" placeholder="Select a City" class="dropdown" />
          <InputText :value="selectedUrl.url" disabled />
          <Button icon="pi pi-copy" outlined @click="copy(selectedUrl.url)" v-tooltip.bottom="'Copy'" />
        </div>
      </div>

      <!-- filters: old code - keep for comparing -->
      <!--
      <div class="flex flex-column gap-5">
        <div class="flex gap-5">
          <InputText id="domain" type="text" :placeholder="t('filter.search')" v-model="inputFilter" />
          <Button :disabled="isLoading" @click="handleFilter" class="max-w-10rem flex justify-content-center">{{ t("filter.filter") }}</Button>
        </div>
        <div class="flex">
          <div class="flex gap-2 align-items-center w-3">
            <label class="switch">
              <input v-model="defaultFilter.reacted" type="checkbox" />
              <span class="slider round"></span>
            </label>
            <div>{{ t("filter.like") }}</div>
          </div>
          <div class="flex gap-2 align-items-center w-3 justify-content-center">
            <label class="switch">
              <input v-model="defaultFilter.shared" type="checkbox" />
              <span class="slider round"></span>
            </label>
            <div>{{ t("filter.share") }}</div>
          </div>
          <div class="align-items-center w-3 justify-content-center">
            <div class="flex gap-2 align-items-center main-content pl-6">
              <label class="switch">
                <input v-model="defaultFilter.perfectMatch" type="checkbox" />
                <span class="slider round"></span>
              </label>
              <div class="flex align-items-center justify-content-center gap-1">
                <div>{{ t("filter.correctKeyword") }}</div>
                <div v-tooltip.top="t('filter.tooltipFirst')" class="pi pi-question-circle"></div>
              </div>
            </div>
          </div>
          <div class="flex gap-2 align-items-center w-3 justify-content-end">
            <label class="switch">
              <input v-model="defaultFilter.removeDuplicateComment" type="checkbox" />
              <span class="slider round"></span>
            </label>
            <div>{{ t("filter.doubleComment") }}</div>
          </div>
        </div>
        <div class="flex">
          <div class="flex gap-2 align-items-center w-3">
            <label class="switch">
              <input v-model="defaultFilter.caseSensitive" type="checkbox" />
              <span class="slider round"></span>
            </label>
            <div>{{ t("filter.caseSensitive") }}</div>
          </div>
          <div class="flex gap-2 align-items-center w-3 justify-content-center">
            <label class="switch">
              <input v-model="filterByTimeToggle" type="checkbox" />
              <span class="slider round"></span>
            </label>
            <div>{{ t("filter.time") }}</div>
          </div>
          <div v-if="filterByTimeToggle" class="flex gap-2 align-items-center w-3 justify-content-center">
            <input class="form-control" type="time" v-model="timeFirst" @change="updateTime(0, $event)" step="60" />
            <input class="form-control" v-model="timeSecond" type="time" @change="updateTime(1, $event)" step="60" />
          </div>
          <div class="flex gap-2 align-items-center" :class="filterByTimeToggle ? 'w-3 justify-content-end' : filterLastCommentToggle ? 'w-6' : 'w-3 '">
            <div class="flex gap-2 align-items-center pl-6 main-content">
              <div>
                <label class="switch">
                  <input v-model="filterLastCommentToggle" type="checkbox" />
                  <span class="slider round"></span>
                </label>
              </div>
              <span v-if="filterLastCommentToggle" class="p-float-label">
                <Chips class="chips" id="chips" v-model="defaultFilter.filterLatestComment" />
                <label for="chips">{{ t("filter.resultLast") }}</label>
              </span>
              <div v-else class="flex align-items-center justify-content-center gap-1">
                <div>{{ t("filter.lastComment") }}</div>
                <div v-tooltip.top="t('filter.tooltipSecond')" class="pi pi-question-circle"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      -->

      <!-- filters: improve responsive -->
      <div class="flex flex-column row-gap-5">
        <div class="flex gap-2 sm:gap-3">
          <InputText id="domain" type="text" :placeholder="t('filter.search')" v-model="inputFilter" />
          <Button :disabled="isLoading" @click="handleFilter" class="max-w-10rem flex justify-content-center">{{ t("filter.filter") }}</Button>
        </div>
        <div class="grid">
          <!-- Filter by like -->
          <div class="col-12 sm:col-6 md:col-3 flex">
            <div class="flex gap-2 align-items-center cursor-pointer">
              <InputSwitch
                v-model="defaultFilter.reacted"
                input-id="id-input-switch-reacted"
                class="flex-shrink-0"
              />
              <label
                for="id-input-switch-reacted"
                class="cursor-pointer"
              >
                {{ t("filter.like") }}
              </label>
            </div>
          </div>

          <!-- Filter by share -->
          <div class="col-12 sm:col-6 md:col-3 flex">
            <div class="flex gap-2 align-items-center cursor-pointer">
              <InputSwitch
                v-model="defaultFilter.shared"
                input-id="id-input-switch-shared"
                class="flex-shrink-0"
              />
              <label
                for="id-input-switch-shared"
                class="cursor-pointer"
              >
                {{ t("filter.share") }}
              </label>
            </div>
          </div>

          <!-- Perfect match -->
          <div class="col-12 sm:col-6 md:col-3 flex">
            <div class="flex gap-2 align-items-center">
              <InputSwitch
                v-model="defaultFilter.perfectMatch"
                input-id="id-input-switch-perfect-match"
                class="flex-shrink-0"
              />
              <div class="white-space-nowrap">
                <label
                  for="id-input-switch-perfect-match"
                  class="cursor-pointer"
                >
                  {{ t("filter.correctKeyword") }}
                </label>
                <span v-tooltip.top="t('filter.tooltipFirst')" class="pi pi-question-circle ml-1" />
              </div>
            </div>
          </div>

          <!-- Filter duplicate respondents -->
          <div class="col-12 sm:col-6 md:col-3 flex">
            <div class="flex gap-2 align-items-center cursor-pointer">
              <InputSwitch
                v-model="defaultFilter.removeDuplicateComment"
                input-id="id-input-switch-duplicate"
                class="flex-shrink-0"
              />
              <label
                for="id-input-switch-duplicate"
                class="cursor-pointer"
              >
                {{ t("filter.doubleComment") }}
              </label>
            </div>
          </div>
        </div>
        <div class="grid">
          <!-- Case sensitive -->
          <div class="col-12 sm:col-6 md:col-3 flex">
            <div class="flex gap-2 align-items-center cursor-pointer">
              <InputSwitch
                v-model="defaultFilter.caseSensitive"
                input-id="id-input-switch-case-sensitive"
                class="flex-shrink-0"
              />
              <label
                for="id-input-switch-case-sensitive"
                class="cursor-pointer"
              >
                {{ t("filter.caseSensitive") }}
              </label>
            </div>
          </div>

          <!-- Filter by time -->
          <div
            class="col-12 sm:col-6 lg:col-3 flex flex-wrap gap-2"
            :class="filterLastCommentToggle ? 'md:col-6' : 'md:col-3'"
          >
          <div class="flex gap-2 align-items-center cursor-pointer">
              <InputSwitch
                v-model="filterByTimeToggle"
                input-id="id-input-switch-time"
                class="flex-shrink-0"
              />
              <label
                for="id-input-switch-time"
                class="cursor-pointer"
              >
                {{ t("filter.time") }}
              </label>
            </div>
            <!-- Additional inputs for Filter by time -->
            <div v-if="filterByTimeToggle" class="flex gap-1 align-items-center">
              <input class="form-control px-1" type="time" v-model="timeFirst" @change="updateTime(0, $event)" step="60" />
              <input class="form-control px-1" v-model="timeSecond" type="time" @change="updateTime(1, $event)" step="60" />
            </div>
          </div>

          <!-- Filter latest comment -->
          <div
            class="col-12 md:col-6 flex"
            :class="filterLastCommentToggle ? 'lg:col-6' : 'lg:col-3'"
          >
            <div class="flex gap-2 align-items-center">
              <InputSwitch
                v-model="filterLastCommentToggle"
                input-id="id-input-switch-latest-comment"
                class="flex-shrink-0"
              />
              <div v-if="filterLastCommentToggle" class="p-float-label">
                <Chips class="chips" id="chips" v-model="defaultFilter.filterLatestComment" />
                <label
                  for="chips"
                  class="cursor-pointer"
                >
                  {{ t("filter.resultLast") }}
                </label>
              </div>
              <div v-else class="white-space-nowrap">
                <label
                  for="id-input-switch-latest-comment"
                  class="cursor-pointer"
                >
                  {{ t("filter.lastComment") }}
                </label>
                <span v-tooltip.top="t('filter.tooltipSecond')" class="pi pi-question-circle ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="">
      
    </div>
    <div class="container-table">
      <div class="flex header-filter">
        <div class="left">#</div>
        <div>{{ totalComment + " " + t("filter.total") }}</div>
      </div>
      <div class="flex flex-column comment-result">
        <div v-for="(cm, index) in comments" :key="cm.id" class="flex">
          <div class="left">{{ page * rows - rows + 1 + index }}</div>
          <div class="flex flex-row gap-1 cm-row align-items-center">
            <div class="avatar" :style="{ 'background-image': `url(${cm.author_avatar})` }">
              <img :src="cm.platform_icon" alt="" />
            </div>
            <div class="flex flex-column">
              <div class="font-semibold">{{ cm.author_name }}</div>
              <div class="">{{ cm.text }}</div>
            </div>
            <!-- <div v-if="cm.winning">Win</div> -->
          </div>
        </div>
      </div>
    </div>

    <!-- pagination: old code - keep for comparing -->
    <!--
    <div class="paging flex align-items-center justify-content-center gap-8">
      {{ t("filter.page") + " " + page }}
      <Button :disabled="isLoading || !totalComment" @click="nextPage(0)" class="pi pi-arrow-left flex align-items-center justify-content-center button-change-page" />
      <Button :disabled="isLoading || !totalComment" @click="nextPage(1)" class="pi pi-arrow-right flex align-items-center justify-content-center button-change-page" />
      {{ comments.length < rows ? comments.length : rows }} {{ t("filter.in") }} {{ totalComment }} {{ t("filter.comment") }}
      <Dropdown v-model="selectRows" :options="selectOption" optionLabel="name" placeholder="Select a City" class="dropdown" />
    </div>
    -->

    <!-- pagination: improve responsive -->
    <div class="paging flex align-items-center justify-content-center column-gap-8 row-gap-2 p-2">
      <div class="flex align-items-center column-gap-4 sm:column-gap-8">
        {{ t("filter.page") + " " + page }}
        <Button :disabled="isLoading || !totalComment" @click="nextPage(0)" class="pi pi-arrow-left flex align-items-center justify-content-center button-change-page" />
        <Button :disabled="isLoading || !totalComment" @click="nextPage(1)" class="pi pi-arrow-right flex align-items-center justify-content-center button-change-page" />
      </div>
      <div class="flex align-items-center column-gap-4 sm:column-gap-8">
        {{ comments.length < rows ? comments.length : rows }} {{ t("filter.in") }} {{ totalComment }} {{ t("filter.comment") }}
        <Dropdown v-model="selectRows" :options="selectOption" optionLabel="name" placeholder="Select a City" class="dropdown" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-filter {
  background-color: #eee;
  height: 50px;
  align-items: center;

}

.container-table {
  border: 1px solid #eee;
}

.header-filter .left,
.comment-result .left {
  min-width: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.comment-main {
  gap: 0px;
  border-bottom: 1px solid #eee;
  padding-top: 6px;
  padding-bottom: 6px;
}
.avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background-size: cover;
  border-radius: 100%;
  display: flex;
  align-items: end;
  justify-content: end;
}
.avatar img {
  width: 40px;
}
.form-control {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s ease-in-out;
}

.form-control:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-control:disabled {
  background-color: #f8f9fa;
  opacity: 0.6;
  cursor: not-allowed;
}
.chips {
  min-width: 285px;
}

.dropdown {
  background: #f1f5f9;
}

.comment-result {
  height: calc(100vh - 500px);
  overflow-y: auto;
}
.paging {
  flex-wrap: wrap;
  max-width: 100%;
  min-height: 52px;
  background-color: #eee;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: 0.4s;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: 0.4s;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #2196f3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.winning {
  background-color: #fca0a0;
}

@media only screen and (min-width: 1550px) {
  .main-content {
    min-width: 300px;
    width: fit-content;
  }
}
</style>

