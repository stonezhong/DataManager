import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {ApplicationTable} from '/components/business/application'
import {TopMessage} from '/components/generic/top_message/main.jsx'
import {PageHeader} from '/components/generic/page_tools'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user, handle_json_response} from '/common_lib'
import {saveApplication} from '/apis'

class ApplicationsPage extends React.Component {
    theTopMessageRef        = React.createRef();
    theApplicationEditorRef = React.createRef();
    theApplicationTableRef  = React.createRef();

    onSave = (mode, application) => {
        return saveApplication(
            get_csrf_token(), mode, application
        ).then(this.theApplicationTableRef.current.refresh)
    };

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/Applications/",
            queryParams: {
                offset: offset,
                limit : limit,
            }
        };
        if (!this.props.current_user || !this.props.current_user.is_superuser) {
            // non-admin should not see system apps
            buildArgs.queryParams.sys_app_id__isnull = "True";
        }
        const url = buildUrl('', buildArgs);
        return fetch(url).then(handle_json_response);
    };


    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <TopMessage ref={this.theTopMessageRef} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <PageHeader title="Applications">
                            {
                                !!this.props.current_user && <Button
                                    size="sm"
                                    className="c-vc ml-2"
                                    onClick={() => {
                                        this.theApplicationEditorRef.current.openDialog("new");
                                    }}
                                >
                                    Create
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <ApplicationTable
                            ref={theApplicationTableRef}
                            get_page={this.get_page}
                            page_size={15}
                            size="sm"
                        />
                    </Col>
                </Row>

                <ApplicationEditor
                    ref={this.theApplicationEditorRef}
                    onSave={this.onSave}
                />

            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <ApplicationsPage current_user={current_user} />,
        document.getElementById('app')
    );
});
