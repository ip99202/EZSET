<template>
    <v-container>
        <v-card outlined :loading="isLoading">
            <v-card-title v-if="!edit">게시물 작성</v-card-title>
            <v-card-title v-else>게시물 수정</v-card-title>
            <v-card-text>
                <v-text-field
                    v-model="newMaterial.title"
                    label="제목"
                    hide-details
                    class="mb-4"
                ></v-text-field>
                <v-textarea
                    outlined
                    v-model="newMaterial.content"
                    name="input-7-4"
                    label="내용"
                ></v-textarea>

                <file-upload
                    v-model="uploadFile.selected"
                    :currentProgress="uploadFile.currentProgress"
                    :fileProgress="uploadFile.fileProgress"
                    :uploading="uploadFile.isUploading"
                    :uploaded="uploadFile.uploaded"
                    class="mt-3"
                ></file-upload>
                <div class="d-flex align-center mt-3">
                    <v-spacer></v-spacer>
                    <small class="red--text mr-3" v-if="isError"
                        >게시물 작성에 실패했습니다.</small
                    >
                    <small class="red--text mr-3" v-if="isLengthError"
                        >제목과 본문의 길이는 100자를 넘을 수 없습니다.</small
                    >
                    <v-btn
                        class="ma-2"
                        tile
                        outlined
                        :disabled="isLoading"
                        color="red"
                        @click="closeButtonClick"
                    >
                        <v-icon left>mdi-close</v-icon>작성 취소
                    </v-btn>
                    <v-btn
                        class="ma-2"
                        tile
                        outlined
                        :disabled="isLoading"
                        color="blue darken-3"
                        @click="submitClick"
                    >
                        <v-icon left>mdi-pencil</v-icon>작성
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
import axios from 'axios'
import FileUpload from '../../components/file/FileUpload'

export default {
    components: {
        FileUpload,
    },
    props: {
        parent_id: String,
        edit: {
            type: String,
            default: undefined,
        },
        editMaterial: {
            type: Object,
        },
    },
    data() {
        return {
            newMaterial: {
                title: '',
                content: '',
                author: '',
                created_date: '',
            },
            folderId: '',
            uploadFile: {
                selected: [],
                uploaded: [],
                isUploading: false,
                currentProgress: 0,
                fileProgress: 0,
            },
            isLoading: false,
            isError: false,
            isLengthError: false,
            editor: {
                options: {
                    language: 'ko',
                },
            },
        }
    },
    methods: {
        contentLength() {
            if (
                this.newMaterial.content.length > 100 ||
                this.newMaterial.title.length > 100
            ) {
                this.isLengthError = true
                return true
            } else {
                this.isLengthError = false
                return false
            }
        },
        async submitClick() {
            if (this.contentLength() == true) {
                return
            }
            if (this.edit) {
                await this.applyEdit()
            } else {
                await this.applyWrite()
            }
        },
        async applyWrite() {
            try {
                this.isLoading = true

                // 첨부파일 업로드
                const fileIds = await this.uploadFiles()

                await axios.post(
                    '/filebox/folder/' + this.$route.params.folder_id,
                    {
                        title: this.newMaterial.title,
                        content: this.newMaterial.content,
                        files: fileIds,
                        parent_id: this.$route.params.folder_id,
                    }
                )
                this.$router.push({
                    name: 'fileBoxMaterials',
                    params: { folder_id: this.$route.params.folder_id },
                })
            } catch (error) {
                this.isError = true
            } finally {
                this.isLoading = false
            }
        },
        async applyEdit() {
            try {
                this.isLoading = true

                if (!(await this.checkFilesValid())) {
                    await this.$action.showAlertDialog(
                        '파일 업로드 실패',
                        '10MB 이하의 파일만 첨부 가능합니다.'
                    )
                    return
                }

                // 첨부파일 업로드
                const fileIds = await this.uploadFiles()

                await axios.patch('filebox/material/' + this.edit, {
                    title: this.newMaterial.title,
                    content: this.newMaterial.content,
                    files: fileIds,
                })
                this.$router.push({
                    name: 'fileBoxMaterials',
                    params: { folder_id: this.folderId },
                })
            } catch (error) {
                this.isError = true
            } finally {
                this.isLoading = false
            }
        },
        async uploadFiles() {
            const fileIds = []

            const fileCount = this.uploadFile.selected.length

            if (fileCount > 0) {
                this.uploadFile.isUploading = true
                this.uploadFile.fileProgress = 0

                for (let file of this.uploadFile.selected) {
                    if (file.uploaded) {
                        fileIds.push(file.id)
                        continue
                    }
                    let form = new FormData()
                    form.append('file', file.file)
                    this.uploadFile.currentProgress = 0
                    const res = await axios.post('file/upload', form, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        // 진행상황 반영
                        onUploadProgress: e => {
                            this.uploadFile.currentProgress += Math.floor(
                                (e.loaded * 100) / e.total
                            )
                        },
                    })
                    this.uploadFile.fileProgress += 1
                    fileIds.push(res.data.id)
                }

                this.uploadFile.isUploading = true
            }

            return fileIds
        },
        async checkFilesValid() {
            // 파일의 크기가 10MB 이하인지 체크
            const exceed = this.uploadFile.selected.filter(file => {
                if (!file.uploaded && file.file.size > 10000000) {
                    return true
                }
                return false
            })
            if (exceed.length > 0) {
                return false
            }
            return true
        },
        async fetchMaterial() {
            this.isLoading = true
            const res = await axios.get(`filebox/material/${this.edit}`)
            this.newMaterial = {
                title: res.data.title,
                content: res.data.content,
            }
            this.folderId = res.data.folder_id
            this.uploadFile.uploaded = res.data.files.map(file => {
                return {
                    filename: file.filename,
                    id: file.id,
                }
            })
            this.isLoading = false
        },
        closeButtonClick() {
            // this.$emit('close')
            this.$router.push({
                name: 'fileBoxMaterials',
                params: { folder_id: this.$route.params.folder_id },
            })
        },
    },
    async created() {
        try {
            if (this.edit) {
                await this.fetchMaterial()
            }
        } catch (error) {
            //
        }
    },
}
</script>
