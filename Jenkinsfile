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

    stages {
        stage('Clone') {
            steps {
                sh 'git clone https://github.com/rizqinrifai/be-devsecops.git'
            }
        }
        stage('[SCA] Trivy Scan') {
            steps {
                script {
                    echo 'Scanning for vulnerabilities using Trivy...'
                    sh 'trivy fs --format=json --output=trivy.json .'
                }
                archiveArtifacts artifacts: 'trivy.json'
            }
        }
        stage('[SAST] SonarQube') {
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
            steps {
                sh 'docker-compose up -d'
            }
        }
        stage('[DAST] OWASP ZAP') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                    script {
                        echo 'Running OWASP ZAP scan...'
                        sh 'docker --version'  // Check Docker version to ensure Docker is running
                        sh 'mkdir -p ${WORKSPACE}/zap-reports'  // Ensure the directory exists
                        sh 'docker pull ghcr.io/zaproxy/zaproxy:stable'
                        sh '''
                            docker run --user $(id -u) \
                                -v ${WORKSPACE}/zap-reports:/zap/wrk \
                                ghcr.io/zaproxy/zaproxy:stable \
                                zap-full-scan.py -t http://139.162.18.93:3003 -r /zap/wrk/zap-report.html
                        '''
                        // Check if the report was generated
                        sh 'test -f ${WORKSPACE}/zap-reports/zap-report.html'
                    }
                    sh 'cp ${WORKSPACE}/zap-reports/zap-report.html ./zap-report.html'
                    archiveArtifacts artifacts: 'zap-report.html'
                }
            }
        }
        stage('[DAST] Dastardly') {
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
    }

    post {
        always {
            junit testResults: 'dastardly-report.xml', skipPublishingChecks: true
        }
//         success {
//             echo "Post Success"
//             discordSend description: "Jenkins Pipeline Build", footer: "Pipeline Success", link: env.BUILD_URL, result: currentBuild.currentResult, title: JOB_NAME, webhookURL: "https://discordapp.com/api/webhooks/1245658580485541958/-qTrq_-tzCe6HliVp-U2epamzlh6AN-c2bbzU5FFvJXgNzzz_PxlshYKTtAxI-6gKRVw"
//         }
//         failure {
//             echo "Post Failure"
//             discordSend description: "Jenkins Pipeline Build", footer: "Pipeline Failure", link: env.BUILD_URL, result: currentBuild.currentResult, title: JOB_NAME, webhookURL: "https://discordapp.com/api/webhooks/1245658580485541958/-qTrq_-tzCe6HliVp-U2epamzlh6AN-c2bbzU5FFvJXgNzzz_PxlshYKTtAxI-6gKRVw"
//         }
    }
}
