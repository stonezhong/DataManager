import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Button from 'react-bootstrap/Button'

import {DataRepoTable, DataRepoEditor} from '/components/business/datarepo'

import {TopMessage} from '/components/generic/top_message/main.jsx'
import {PageHeader} from '/components/generic/page_tools'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user, handle_json_response} from '/common_lib'
import {saveDataRepo} from '/apis'

class DataReposPage extends React.Component {
    theTopMessageRef        = React.createRef();
    theDataRepoEditorRef    = React.createRef();
    theDataRepoTableRef     = React.createRef();

    onSave = (mode, datarepo) => {
        return saveDataRepo(
            get_csrf_token(), mode, datarepo
        ).then(this.theDataRepoTableRef.current.refresh)
    };

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/DataRepos/",
            queryParams: {
                offset: offset,
                limit : limit,
            }
        };
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
                        <PageHeader title="Data Repositories">
                            {
                                !!this.props.current_user && this.props.current_user.is_superuser &&
                                <Button
                                    size="sm"
                                    className="c-vc ml-2"
                                    onClick={() => {
                                        this.theDataRepoEditorRef.current.openDialog("new");
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
                        <DataRepoTable
                            ref={this.theDataRepoTableRef}
                            get_page={this.get_page}
                            page_size={15}
                            size="sm"
                        />
                    </Col>
                </Row>

                <DataRepoEditor
                    ref={this.theDataRepoEditorRef}
                    onSave={this.onSave}
                />

            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <DataReposPage current_user={current_user} />,
        document.getElementById('app')
    );
});