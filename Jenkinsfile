pipeline {
    agent {
        label 'agent-rizqi'
    }

    environment {
        SONARQUBE_SERVER = 'sonar'
        SONARQUBE_SCANNER = 'sonar-scanner'
        SONAR_HOST_URL = 'https://sonar.teamdev.id/'
//         SONAR_AUTH_TOKEN = credentials('sonardev')
        VAULT_ADDR = 'https://vault.teamdev.id/'
        VAULT_SECRET = vault path: 'secret/sonar', key: 'sonar-dev'
        ZAP_DOCKER_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable'
    }

    parameters {
        choice(name: 'BUILD_TYPE', choices: ['Scan', 'Release', 'Restart'], description: 'Select the type of build to run')
        string(name: 'BRANCH_NAME', defaultValue: '', description: 'Branch name for Scan build')
        string(name: 'TAG_NAME', defaultValue: '', description: 'Tag name for Release build')
    }

    stages {
        stage('Determine Build Type') {
            steps {
                script {
                    echo "Build Type: ${params.BUILD_TYPE}"
                    echo "Branch Name: ${params.BRANCH_NAME}"
                    echo "Tag Name: ${params.TAG_NAME}"

                    switch(params.BUILD_TYPE) {
                        case 'Scan':
                            if (params.BRANCH_NAME == '') {
                                error "Branch name is required for Scan build"
                            }
                            env.GIT_BRANCH = params.BRANCH_NAME
                            break
                        case 'Release':
                            if (params.TAG_NAME == '') {
                                error "Tag name is required for Release build"
                            }
                            env.GIT_TAG = params.TAG_NAME
                            break
                        case 'Restart':
                            echo "Preparing for restart"
                            break
                        default:
                            error "Invalid build type selected"
                    }
                }
            }
        }

        stage('Clone') {
            when {
                expression { params.BUILD_TYPE != 'Restart' }
            }
            steps {
                script {
                    if (params.BUILD_TYPE == 'Scan') {
                        sh "git clone -b ${env.GIT_BRANCH} https://github.com/rizqinrifai/be-devsecops.git"
                    } else if (params.BUILD_TYPE == 'Release') {
                        sh "git clone https://github.com/rizqinrifai/be-devsecops.git"
                        dir('be-devsecops') {
                            sh "git checkout ${env.GIT_TAG}"
                        }
                    }
                }
            }
        }

        stage('[SCA] Trivy Scan') {
            when {
                expression { params.BUILD_TYPE != 'Restart' }
            }
            steps {
                script {
                    echo 'Scanning for vulnerabilities using Trivy...'
                    sh 'trivy fs --format=json --output=trivy.json .'
                }
                archiveArtifacts artifacts: 'trivy.json'
            }
        }

        stage('[SAST] SonarQube') {
            when {
                expression { params.BUILD_TYPE != 'Restart' }
            }
            steps {
                script {
                    def scannerHome = tool name: env.SONARQUBE_SCANNER, type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    withSonarQubeEnv(env.SONARQUBE_SERVER) {
                        sh "${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=be-devsecops \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.login=${env.VAULT_SECRET}"
                    }
                }
            }
        }

        stage('Deploy') {
            when {
                expression { params.BUILD_TYPE == 'Release' }
            }
            steps {
                sh 'docker-compose up -d'
            }
        }

        stage('[DAST] OWASP ZAP') {
            when {
                expression { params.BUILD_TYPE == 'Release' }
            }
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                    script {
                        echo 'Running OWASP ZAP scan...'
                        sh 'docker --version'
                        sh 'mkdir -p ${WORKSPACE}/zap-reports'
                        sh 'docker pull ghcr.io/zaproxy/zaproxy:stable'
                        sh '''
                            docker run --user $(id -u) \
                                -v ${WORKSPACE}/zap-reports:/zap/wrk \
                                ghcr.io/zaproxy/zaproxy:stable \
                                zap-full-scan.py -t http://139.162.18.93:3003 -r /zap/wrk/zap-report.html
                        '''
                        sh 'test -f ${WORKSPACE}/zap-reports/zap-report.html'
                    }
                    sh 'cp ${WORKSPACE}/zap-reports/zap-report.html ./zap-report.html'
                    archiveArtifacts artifacts: 'zap-report.html'
                }
            }
        }

        stage('[DAST] Dastardly') {
            when {
                expression { params.BUILD_TYPE == 'Release' }
            }
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                    script {
                        sh 'docker pull public.ecr.aws/portswigger/dastardly:latest'
                        sh '''
                        docker run --user $(id -u) -v ${WORKSPACE}:${WORKSPACE}:rw \
                        -e BURP_START_URL=http://139.162.18.93:3003 \
                        -e BURP_REPORT_FILE_PATH=${WORKSPACE}/dastardly-report.xml \
                        public.ecr.aws/portswigger/dastardly:latest
                        '''
                    }
                }
                archiveArtifacts artifacts: 'dastardly-report.xml', allowEmptyArchive: true
            }
        }

        stage('Restart Services') {
            when {
                expression { params.BUILD_TYPE == 'Restart' }
            }
            steps {
                script {
                    echo 'Restarting services...'
                    sh 'docker-compose down'
                    sh 'docker-compose up -d'
                }
            }
        }
    }

    post {
        always {
            junit testResults: 'dastardly-report.xml', skipPublishingChecks: true
        }
        success {
            echo "Post Success"
            discordSend description: "Jenkins Pipeline Build", footer: "Pipeline Success", link: env.BUILD_URL, result: currentBuild.currentResult, title: JOB_NAME, webhookURL: "https://discordapp.com/api/webhooks/1245658580485541958/-qTrq_-tzCe6HliVp-U2epamzlh6AN-c2bbzU5FFvJXgNzzz_PxlshYKTtAxI-6gKRVw"
        }
        failure {
            echo "Post Failure"
            discordSend description: "Jenkins Pipeline Build", footer: "Pipeline Failure", link: env.BUILD_URL, result: currentBuild.currentResult, title: JOB_NAME, webhookURL: "https://discordapp.com/api/webhooks/1245658580485541958/-qTrq_-tzCe6HliVp-U2epamzlh6AN-c2bbzU5FFvJXgNzzz_PxlshYKTtAxI-6gKRVw"
        }
    }
}