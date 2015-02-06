QUnit.test( "Vodafone is defined", function( assert ) {
  assert.ok( Vodafone !== null, "Passed!" );
});

QUnit.test( "Vodafone is not initialized", function( assert ) {
    var successCallback = function() {
        assert.ok( false , "Failed! It should not have been initialized" );
    };

    var errorCallback = function() {
        assert.ok( true , "Passed!" );
    };

    Vodafone.getToken(null, successCallback, errorCallback);
});

QUnit.test( "Vodafone initialization", function( assert ) {
    Vodafone.init();
    var successCallback = function() {
        assert.ok( false , "Failed! It should not have been initialized" );
    };

    var errorCallback = function() {
        assert.ok( true , "Passed!" );
    };

    Vodafone.getToken(null, successCallback, errorCallback);
});